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
    supportedTokens: {
        eth: {
            "arb-sepolia": {
                amount: ethers.parseEther("0.003"),
            },
            "imola": {
                amount: ethers.parseEther("0.003"),
            }
        },
        ovl: {
            "arb-sepolia": {
                address: "0xa6d5fef06111ad768617d26024874c99dc42d96f",
                amount: ethers.parseEther("50"), // 50 OVL
            },
            "bartio": {
                address: "0xdCeB93598060B0677ef376Ab9Ed1f1e9bAcCA880",
                amount: ethers.parseEther("50"), // 50 OVL
            },
            "imola": {
                address: "0xCde46284D32148c4D470fA33BA788710b3d21E89", // Replace with actual address
                amount: ethers.parseEther("50"), // 50 OVL
            },
        }
    },
    rpcUrls: {
        "eth-mainnet": process.env.ETH_MAINNET_PROVIDER_URL,
        "arb-mainnet": process.env.ARB_MAINNET_PROVIDER_URL,
        "arb-sepolia": process.env.SEPOLIA_PROVIDER_URL,
        "bartio": process.env.BARTIO_PROVIDER_URL,
        "imola": process.env.IMOLA_PROVIDER_URL,
    }
})
