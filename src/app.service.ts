/* eslint-disable prettier/prettier */
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
      "bnb-testnet": this.loadAlreadyClaimed("bnb-testnet"),
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
    const bnbMainnetBalance = await this.getBalance("bnb-mainnet", recipient)
    
    // Get balance at specific timestamp (1747144800 - 13th May 2025, 16:00 UTC)
    const provider = new ethers.JsonRpcProvider(rpcUrls["bnb-mainnet"])
    
    // Find block closest to timestamp 1747144800
    const timestampBlock = await provider.getBlock(1747144800)
    const historicalBlockNumber = timestampBlock ? timestampBlock.number : await provider.getBlockNumber()
    
    // Get balance at that specific timestamp
    const historicalBalance = await provider.getBalance(recipient, historicalBlockNumber)
    
    const minRequiredBalance = ethers.parseEther("0.002")
    
    if (bnbMainnetBalance < minRequiredBalance || historicalBalance < minRequiredBalance)
      throw new Error("recipient must have at least 0.002 BNB on BNB Mainnet, both now and before")

    const pendingTxs: Promise<ethers.TransactionResponse>[] = []

    for (const chain of chains) {
      if (!this.alreadyClaimed[chain]) this.alreadyClaimed[chain] = this.loadAlreadyClaimed(chain)
      if (!this.alreadyClaimed[chain][recipient]) this.alreadyClaimed[chain][recipient] = []

      // Check if the recipient has already claimed both tokens on this chain
      if (this.alreadyClaimed[chain][recipient].includes("eth") && this.alreadyClaimed[chain][recipient].includes("ovl")) {
        throw new Error(`Recipient has already claimed both tokens on chain (${chain})`)
      }

      const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
      const signer = new ethers.Wallet(this.configService.get("fundsWallet"), provider)
      let nonce = await provider.getTransactionCount(signer.address, 'latest')

      const block = await provider.getBlock("latest");
      const baseFeePerGas = block.baseFeePerGas || ethers.parseUnits('1', 'gwei');
      const maxPriorityFeePerGas = baseFeePerGas + ethers.parseUnits('2', 'gwei');
      const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;

      if (chain === "imola") {
        // Use the contract to distribute both OVL and ETH
        const contractAddress = supportedTokens["ovl"]["imola"].address; // Using supportedTokens.ovl.imola
        const distributorContract = new ethers.Contract(
          contractAddress,
          ["function distributeTokensAndEth(address recipient, uint256 tokenAmount, uint256 ethAmount)"],
          signer
        );

        const ovlAmount = supportedTokens["ovl"][chain].amount;
        const ethAmount = supportedTokens["eth"][chain].amount;

        const tx = distributorContract.distributeTokensAndEth(recipient, ovlAmount, ethAmount, {
          nonce,
          maxPriorityFeePerGas,
          maxFeePerGas
        });

        pendingTxs.push(tx);
      } else {
        // Send OVL and ETH separately for other chains
        const ethAmount = supportedTokens["eth"][chain].amount;
        const ovlAmount = supportedTokens["ovl"][chain].amount;

        // Send ETH
        const ethTx = signer.sendTransaction({
          to: recipient,
          value: ethAmount,
          nonce,
          maxPriorityFeePerGas,
          maxFeePerGas
        });
        pendingTxs.push(ethTx);
        nonce++;

        // Send OVL (ERC20)
        const ovlConfig = supportedTokens["ovl"][chain];
        const erc20 = new ethers.Contract(
          ovlConfig.address,
          ["function transfer(address to, uint256 amount)"],
          signer
        );
        const ovlTx = erc20.transfer(recipient, ovlAmount, {
          nonce,
          maxPriorityFeePerGas,
          maxFeePerGas
        });
        pendingTxs.push(ovlTx);
        nonce++;
      }

      // Mark both tokens as claimed for the recipient on this chain
      this.alreadyClaimed[chain][recipient].push("eth");
      this.alreadyClaimed[chain][recipient].push("ovl");
    }

    const txs = await Promise.allSettled(pendingTxs)

    const response: Record<string, { status: string, txHash?: string, reason?: string }> = {}

    for (const chain of chains) {
      const transactionsPerChain = chain === "imola" ? 1 : 2; // 1 transaction for imola (contract call), 2 for others

      for (let j = 0; j < transactionsPerChain; j++) {
        const token = j === 0 ? "eth" : "ovl";
        const txIndex = chains.indexOf(chain) * 2 + j; // Correct indexing logic

        const tx = txs[txIndex];

        if (tx && tx.status === "fulfilled") {
          response[`${chain}-${token}`] = { status: "success", txHash: tx.value.hash };
        } else if (tx && tx.status === "rejected") {
          response[`${chain}-${token}`] = { status: "error", reason: `could not transfer token (${token}) to recipient on chain (${chain})` };
          this.alreadyClaimed[chain][recipient] = this.alreadyClaimed[chain][recipient].filter(t => t !== token);

          const errMessage: string = tx.reason.message ?? "unknown error";
          console.log(`Error transferring token (${token}) to recipient (${recipient}) on chain (${chain}): ${errMessage}`);
          response[`${chain}-${token}`].reason = "too many requests, please try again in a few seconds";
        } else {
          response[`${chain}-${token}`] = { status: "error", reason: `No transaction was found for token (${token}) on chain (${chain})` };
        }
      }
    }

    for (const chain of chains) {
      this.saveAlreadyClaimed(chain);
    }

    return response;
  }
}
