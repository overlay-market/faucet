import { ethers } from "ethers"

// Reference: https://docs.nestjs.com/techniques/configuration#custom-configuration-files
export default () => ({
    port: parseInt(process.env.PORT) || 3000,
    fundsWallet: process.env.PRIVATE_KEY,
    providerUrl: process.env.RPC_PROVIDER_URL,
    supportedTokens: {
        eth: {
            amount: ethers.parseEther("0.0069"), // 0.0069 ETH
        },
        ovl: {
            address: "0x3E27fAe625f25291bFda517f74bf41DC40721dA2",
            amount: ethers.parseEther("100"), // 100 OVL
        },
    }
})
