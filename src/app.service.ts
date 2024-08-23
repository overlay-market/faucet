import * as fs from "fs"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { BlockchainService } from './blockchain/blockchain.service'

@Injectable()
export class AppService {
  private alreadyClaimed: Record<string, Record<string, string[]>>

  constructor(private configService: ConfigService, private blockchainService: BlockchainService) {
    this.alreadyClaimed = {
      "arb-sepolia": this.loadAlreadyClaimed("arb-sepolia"),
      "bartio": this.loadAlreadyClaimed("bartio"),
      "imola": this.loadAlreadyClaimed("imola"),
    }
  }

  private loadAlreadyClaimed(chain: string): Record<string, string[]> {
    const dbPath = chain === "arb-sepolia" ? "alreadyClaimed.json" : `${chain}_alreadyClaimed.json`
    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, "utf8")
        return data ? JSON.parse(data) : {}
      } catch (error) {
        console.error(`Error reading or parsing ${dbPath}:`, error)
        return {}
      }
    } else {
      return {}
    }
  }

  private saveAlreadyClaimed(chain: string): void {
    const dbPath = chain === "arb-sepolia" ? "alreadyClaimed.json" : `${chain}_alreadyClaimed.json`
    fs.writeFileSync(dbPath, JSON.stringify(this.alreadyClaimed[chain], null, 2))
  }

  private async getBalance(chain: string, address: string): Promise<bigint> {
    const rpcUrls = this.configService.get("rpcUrls")
    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const balance = await provider.getBalance(address)
    return balance
  }

  getHello(): string {
    return "Service is up!"
  }

  getClaimed(chain: string, recipient: string) {
    if (!this.alreadyClaimed[chain]) this.alreadyClaimed[chain] = this.loadAlreadyClaimed(chain)
    return this.alreadyClaimed[chain]?.[recipient] || []
  }

  async requestToken(tokens: string[], chains: string[], recipient: string) {
    const supportedTokens = this.configService.get("supportedTokens")
    const rpcUrls = this.configService.get("rpcUrls")
    const arbMainnetBalance = await this.getBalance("arb-mainnet", recipient)
    const ethMainnetBalance = await this.getBalance("eth-mainnet", recipient)

    if (arbMainnetBalance === BigInt(0) && ethMainnetBalance === BigInt(0))
      throw new Error("recipient must have a non-zero balance on either Arbitrum Mainnet or Ethereum Mainnet to claim tokens")

    const pendingTxs: Promise<ethers.TransactionResponse>[] = []

    for (const chain of chains) {
      if (!this.alreadyClaimed[chain]) this.alreadyClaimed[chain] = this.loadAlreadyClaimed(chain)
      if (!this.alreadyClaimed[chain][recipient]) this.alreadyClaimed[chain][recipient] = []

      const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
      const signer = new ethers.Wallet(this.configService.get("fundsWallet"), provider)
      let nonce = await provider.getTransactionCount(signer.address, 'latest')

      const block = await provider.getBlock("latest");
      const baseFeePerGas = block.baseFeePerGas || ethers.parseUnits('1', 'gwei');
      const maxPriorityFeePerGas = baseFeePerGas + ethers.parseUnits('2', 'gwei');
      const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;

      for (const token of tokens) {
        if (!supportedTokens[token]) throw new Error(`unsupported token (${token})`)
        if (!supportedTokens[token][chain]) throw new Error(`token (${token}) is not supported on chain (${chain})`)
        if (this.alreadyClaimed[chain][recipient].includes(token))
          throw new Error(`recipient has already claimed token (${token}) on chain (${chain})`)

        const amount = supportedTokens[token][chain].amount
        let tx: Promise<ethers.TransactionResponse>

        this.alreadyClaimed[chain][recipient].push(token)

        if (token === "eth") {
          tx = signer.sendTransaction({
            to: recipient,
            value: amount,
            nonce,
            maxPriorityFeePerGas,
            maxFeePerGas
          })
        } else {
          const tokenConfig = supportedTokens[token][chain]
          const erc20 = new ethers.Contract(
            tokenConfig.address,
            ["function transfer(address to, uint256 amount)"],
            signer
          )
          tx = erc20.transfer(recipient, tokenConfig.amount, {
            nonce, maxPriorityFeePerGas,
            maxFeePerGas
          })
        }

        pendingTxs.push(tx)
        nonce++
      }
    }

    const txs = await Promise.allSettled(pendingTxs)

    const response: Record<string, { status: string, txHash?: string, reason?: string }> = {}

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      for (let j = 0; j < chains.length; j++) {
        const chain = chains[j]
        const tx = txs[i * chains.length + j]
        if (tx.status === "fulfilled") {
          response[`${token}`] = { status: "success", txHash: tx.value.hash }
        } else {
          response[`${token}`] = { status: "error", reason: `could not transfer token (${token}) to recipient on chain (${chain})` }
          this.alreadyClaimed[chain][recipient] = this.alreadyClaimed[chain][recipient].filter(t => t !== token)

          const errMessage: string = tx.reason.message ?? "unknown error"
          console.log(`Error transferring token (${token}) to recipient (${recipient}) on chain (${chain}): ${errMessage}`)
          if (errMessage.includes("nonce has already been used") || errMessage.includes("nonce too high")) {
            response[`${chain}-${token}`].reason = "too many requests, please try again in a few seconds"
          }
        }
      }
    }

    for (const chain of chains) {
      this.saveAlreadyClaimed(chain)
    }

    return response
  }
}
