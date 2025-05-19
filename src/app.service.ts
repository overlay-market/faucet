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
    const supportedTokens = this.configService.get("supportedTokens");
    const rpcUrls = this.configService.get("rpcUrls");
    const bnbMainnetBalance = await this.getBalance("bnb-mainnet", recipient);
    
    const provider = new ethers.JsonRpcProvider(rpcUrls["bnb-mainnet"]);
    
    // Roughly 3 days ago, block time 1.5s
    const historicalBlockNumber = (await provider.getBlockNumber()) - Math.floor(86400 * 3 / 1.5);
    // Get balance at that specific timestamp
    const historicalBalance = await provider.getBalance(recipient, historicalBlockNumber);
    
    const minRequiredBalance = ethers.parseEther("0.002");

    if (bnbMainnetBalance < minRequiredBalance || historicalBalance < minRequiredBalance)
      throw new Error("recipient must have at least 0.002 BNB on BNB Mainnet, both now and before");

    const response: Record<string, { status: string, txHash?: string, reason?: string }> = {};

    for (const chain of chains) {
      if (!this.alreadyClaimed[chain]) this.alreadyClaimed[chain] = this.loadAlreadyClaimed(chain);
      if (!this.alreadyClaimed[chain][recipient]) this.alreadyClaimed[chain][recipient] = [];

      const provider = new ethers.JsonRpcProvider(rpcUrls[chain]);
      const signer = new ethers.Wallet(this.configService.get("fundsWallet"), provider);
      let nonce = await provider.getTransactionCount(signer.address, 'latest');

      const block = await provider.getBlock("latest");
      const baseFeePerGas = block.baseFeePerGas || ethers.parseUnits('1', 'gwei');
      const maxPriorityFeePerGas = baseFeePerGas + ethers.parseUnits('2', 'gwei');
      const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;

      // Process each token separately
      for (const token of tokens) {
        const responseKey = `${chain}-${token}`;
        
        // Check if already claimed
        if (this.alreadyClaimed[chain][recipient].includes(token)) {
          response[responseKey] = { 
            status: "error", 
            reason: `Recipient has already claimed ${token.toUpperCase()} on chain (${chain})` 
          };
          continue;
        }

        try {
          if (token === "eth") {
            // Send ETH
            const ethAmount = supportedTokens["eth"][chain].amount;
            const ethTx = await signer.sendTransaction({
              to: recipient,
              value: ethAmount,
              nonce,
              maxPriorityFeePerGas,
              maxFeePerGas
            });
            
            response[responseKey] = { status: "success", txHash: ethTx.hash };
            this.alreadyClaimed[chain][recipient].push("eth");
            nonce++;
          } 
          else if (token === "ovl") {
            // Send OVL
            const ovlAmount = supportedTokens["ovl"][chain].amount;
            const ovlConfig = supportedTokens["ovl"][chain];
            
            const erc20 = new ethers.Contract(
              ovlConfig.address,
              ["function transfer(address to, uint256 amount)"],
              signer
            );
            
            const ovlTx = await erc20.transfer(recipient, ovlAmount, {
              nonce,
              maxPriorityFeePerGas,
              maxFeePerGas
            });
            
            response[responseKey] = { status: "success", txHash: ovlTx.hash };
            this.alreadyClaimed[chain][recipient].push("ovl");
            nonce++;
          }
        } catch (error) {
          console.error(`Error sending ${token} on chain ${chain} to ${recipient}:`, 
            error instanceof Error ? error.message : String(error));
          
          response[responseKey] = { 
            status: "error", 
            reason: "too many requests, please try again in a few seconds" 
          };
        }
      }
      
      this.saveAlreadyClaimed(chain);
    }

    return response;
  }
}
