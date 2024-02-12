import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers, NonceManager } from "ethers"

@Injectable()
export class BlockchainService {
  private readonly signer: ethers.NonceManager
  private readonly mainnetProvider: ethers.JsonRpcProvider

  constructor(private configService: ConfigService) {
    const fundsWallet = this.configService.get<string>("fundsWallet")
    const testnetProviderUrl = this.configService.get<string>("testnetProviderUrl")
    const mainnetProviderUrl = this.configService.get<string>("mainnetProviderUrl")
    const testnetProvider = new ethers.JsonRpcProvider(testnetProviderUrl)
    // NonceManager manages concurrent transactions to prevent nonce collisions
    // Reference: https://github.com/ethers-io/ethers.js/issues/4258
    this.signer = new NonceManager(new ethers.Wallet(fundsWallet, testnetProvider))
    this.mainnetProvider = new ethers.JsonRpcProvider(mainnetProviderUrl)
  }

  getSigner() {
    return this.signer
  }

  getMainnetBalance(account: string) {
    return this.mainnetProvider.getBalance(account)
  }
}
