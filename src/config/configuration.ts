import { ethers } from "ethers"

// Reference: https://docs.nestjs.com/techniques/configuration#custom-configuration-files
export default () => ({
    port: parseInt(process.env.PORT) || 3000,
    fundsWallet: process.env.PRIVATE_KEY,
    testnetProviderUrl: process.env.SEPOLIA_PROVIDER_URL,
    mainnetProviderUrl: process.env.MAINNET_PROVIDER_URL,
    supportedTokens: {
        eth: {
            amount: ethers.parseEther("0.003"), // 0.003 ETH
        },
        ovl: {
            address: "0x3E27fAe625f25291bFda517f74bf41DC40721dA2",
            amount: ethers.parseEther("50"), // 50 OVL
        },
    }
})
