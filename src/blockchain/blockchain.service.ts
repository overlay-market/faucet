import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"

@Injectable()
export class BlockchainService {
  private readonly signer: ethers.Wallet

  constructor(private configService: ConfigService) {
    const fundsWallet = this.configService.get<string>("fundsWallet")
    const providerUrl = this.configService.get<string>("providerUrl")
    const provider = new ethers.JsonRpcProvider(providerUrl)
    this.signer = new ethers.Wallet(fundsWallet, provider)
  }

  getSigner(): ethers.Wallet {
    return this.signer
  }
}
