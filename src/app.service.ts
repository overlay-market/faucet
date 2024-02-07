import * as fs from "fs"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { BlockchainService } from './blockchain/blockchain.service';

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

  async requestToken(token: string, recipient: string) {
    // TODO: replace token param with a string[] to allow multiple tokens to be claimed at once
    if (this.alreadyClaimed[recipient] && this.alreadyClaimed[recipient].includes(token)) {
      throw new Error(`recipient has already claimed token (${token})`)
    }

    const supportedTokens = this.configService.get("supportedTokens")

    if (!supportedTokens[token]) throw new Error(`unsupported token (${token})`)

    const signer = this.blockchainService.getSigner()
    const amount = supportedTokens[token].amount

    let tx: ethers.TransactionResponse

    if (token === "eth") {
      tx = await signer.sendTransaction({
        to: recipient,
        value: amount,
      })
    } else {
      const erc20 = new ethers.Contract(
        supportedTokens[token].address,
        ["function transfer(address to, uint256 amount)"],
        signer
      )
      tx = await erc20.transfer(recipient, amount)
    }

    // save the recipient and claimed tokens in the "db", and persist it to disk
    if (!this.alreadyClaimed[recipient]) this.alreadyClaimed[recipient] = []
    this.alreadyClaimed[recipient].push(token)
    fs.writeFileSync(this.dbPath, JSON.stringify(this.alreadyClaimed, null, 2))

    return { txHash: tx.hash }
  }
}
