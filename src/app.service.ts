import * as fs from "fs"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { BlockchainService } from './blockchain/blockchain.service'

@Injectable()
export class AppService {
  // address => claimed tokens
  private alreadyClaimed: Record<string, string[]>
  private readonly dbPath = "alreadyClaimed.json"

  constructor(private configService: ConfigService, private blockchainService: BlockchainService) {
    // use a file to store the already claimed recipients
    if (fs.existsSync(this.dbPath)) {
      this.alreadyClaimed = JSON.parse(fs.readFileSync(this.dbPath, "utf8"))
    } else {
      this.alreadyClaimed = {}
    }
  }

  getHello(): string {
    return "Service is up!"
  }

  async requestToken(tokens: string[], recipient: string) {
    if (!this.alreadyClaimed[recipient]) this.alreadyClaimed[recipient] = []

    const supportedTokens = this.configService.get("supportedTokens")

    // check if the recipient has already claimed any of the tokens, and if they are valid
    for (const token of tokens) {
      if (!supportedTokens[token]) throw new Error(`unsupported token (${token})`)
      if (this.alreadyClaimed[recipient].includes(token))
        throw new Error(`recipient has already claimed token (${token})`)
    }

    const signer = this.blockchainService.getSigner()
    const pendingTxs: Promise<ethers.TransactionResponse>[] = []

    // create a transaction for each token
    for (const token of tokens) {
      const amount = supportedTokens[token].amount
      let tx: Promise<ethers.TransactionResponse>
  
      if (token === "eth") {
        tx = signer.sendTransaction({
          to: recipient,
          value: amount,
        })
      } else {
        const erc20 = new ethers.Contract(
          supportedTokens[token].address,
          ["function transfer(address to, uint256 amount)"],
          signer
        )
        tx = erc20.transfer(recipient, amount)
      }

      pendingTxs.push(tx)
    }

    const txs = await Promise.allSettled(pendingTxs)

    const response: Record<string, { status: string, txHash?: string, reason?: string }> = {}

    // check the status of each transaction and build the response
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const tx = txs[i]
      if (tx.status === "fulfilled") {
        response[token] = { status: "success", txHash: tx.value.hash }
        this.alreadyClaimed[recipient].push(token)
      }
      else {
        response[token] = { status: "error", reason: `could not transfer token (${token}) to recipient` }
        console.log(`Error transferring token (${token}) to recipient (${recipient}): ${tx.reason.message}`)
      }
    }

    // persist the claimed tokens to disk
    fs.writeFileSync(this.dbPath, JSON.stringify(this.alreadyClaimed, null, 2))

    return response
  }
}
