/* eslint-disable prettier/prettier */
import { ethers } from "ethers"

// Reference: https://docs.nestjs.com/techniques/configuration#custom-configuration-files
export default () => ({
    port: parseInt(process.env.PORT) || 3000,
    fundsWallet: process.env.PRIVATE_KEY,
    testnetProviderUrl: process.env.SEPOLIA_PROVIDER_URL,
    mainnetProviderUrl: process.env.MAINNET_PROVIDER_URL,
    ethMainnetProviderUrl: process.env.ETH_MAINNET_PROVIDER_URL,
    bartioProviderUrl: process.env.BARTIO_PROVIDER_URL,
    imolaProviderUrl: process.env.IMOLA_PROVIDER_URL,
    bnbMainnetProviderUrl: process.env.BNB_MAINNET_PROVIDER_URL,
    bnbTestnetProviderUrl: process.env.BNB_TESTNET_PROVIDER_URL,
    supportedTokens: {
        eth: {
            "arb-sepolia": {
                amount: ethers.parseEther("0.003"),
            },
            "imola": {
                amount: ethers.parseEther("0.003"),
            },
            "bartio": {
                amount: ethers.parseEther("0.1"),
            },
            "bnb-testnet": {
                amount: ethers.parseEther("0.03"),
            }
        },
        ovl: {
            "arb-sepolia": {
                address: "0x3E27fAe625f25291bFda517f74bf41DC40721dA2",
                amount: ethers.parseEther("50"), // 50 OVL
            },
            "bartio": {
                address: "0x97576e088f0d05EF68cac2EEc63d017FE90952a0",
                amount: ethers.parseEther("50"), // 50 OVL
            },
            "imola": {
                address: "0x0CebFBa48065B42d47c7C1Ef0db6E1c83091A833", // Replace with actual address
                amount: ethers.parseEther("50"), // 50 OVL
            },
            "bnb-testnet": {
                address: "0xb880e767739a82eb716780bdfdbc1ed7b23bdb38", // Replace with actual OVL address on BNB testnet
                amount: ethers.parseEther("50"), // 50 OVL
            }
        }
    },
    rpcUrls: {
        "eth-mainnet": process.env.ETH_MAINNET_PROVIDER_URL,
        "arb-mainnet": process.env.ARB_MAINNET_PROVIDER_URL,
        "arb-sepolia": process.env.SEPOLIA_PROVIDER_URL,
        "bartio": process.env.BARTIO_PROVIDER_URL,
        "imola": process.env.IMOLA_PROVIDER_URL,
        "bnb-mainnet": process.env.BNB_MAINNET_PROVIDER_URL,
        "bnb-testnet": process.env.BNB_TESTNET_PROVIDER_URL,
    }
})
