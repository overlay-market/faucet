import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { BlockchainService } from './blockchain/blockchain.service';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService, private blockchainService: BlockchainService) {}

  getHello(): string {
    return "Service is up!"
  }

  async requestToken(token: string, recipient: string) {
    const supportedTokens = this.configService.get("supportedTokens")

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

    return { txHash: tx.hash }
  }
}
