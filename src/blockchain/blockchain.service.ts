import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers, NonceManager } from "ethers"

@Injectable()
export class BlockchainService {
  private readonly signer: ethers.NonceManager

  constructor(private configService: ConfigService) {
    const fundsWallet = this.configService.get<string>("fundsWallet")
    const providerUrl = this.configService.get<string>("providerUrl")
    const provider = new ethers.JsonRpcProvider(providerUrl)
    // NonceManager manages concurrent transactions to prevent nonce collisions
    // Reference: https://github.com/ethers-io/ethers.js/issues/4258
    this.signer = new NonceManager(new ethers.Wallet(fundsWallet, provider))
  }

  getSigner() {
    return this.signer
  }
}
