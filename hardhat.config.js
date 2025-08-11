require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Debug: Log environment variables to verify loading
// console.log("ALCHEMY_APIKEY:", process.env.ALCHEMY_APIKEY ? "Loaded" : "Undefined");
// console.log(process.env.ALCHEMY_APIKEY);

// // Validate required environment variables
// if (!process.env.ALCHEMY_APIKEY) {
//     throw new Error("ALCHEMY_APIKEY is not defined in .env file");
// }

// if (!process.env.PRIVATE_KEY) {
//     throw new Error("PRIVATE_KEY is not defined in .env file");
// }

// // Ensure PRIVATE_KEY starts with 0x
const privateKey = process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`;

// // Validate private key format (64 hex characters after 0x)
// if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
//     throw new Error("PRIVATE_KEY must be a valid 64-character hex string");
// }

module.exports = {
    solidity: {
        version: "0.8.30",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            // Add explicit contract size limit handling
            viaIR: true,
        },
    },
    defaultNetwork: "localhost",
    networks: {
        hardhat: {
            chainId: 31337,
            //rpcUrl: "http://192.168.43.170:8545",
            //url: "http://192.168.43.170:8545",
            chainName: "hardhat",
            currency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: [],
        },
        localhost: {
            chainId: 31337,
            url: "http://127.0.0.1:8545",
            rpcUrl: "http://127.0.0.1:8545",
            currency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: [],
        },
        sepolia: {
            url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
            accounts: [privateKey],
            chainId: 11155111,
            // Dynamic gas pricing for Sepolia
            gasPrice: "auto",
            gas: "auto",
            // Add timeout and retry settings
            timeout: 60000,
            httpHeaders: {
                "User-Agent": "hardhat",
            },
        },
    },

    // Set default network for development
    defaultNetwork: "hardhat",

    // Gas reporter configuration
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
        gasPrice: 20, // gwei
        showTimeSpent: true,
    },

    // Etherscan verification
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || "",
        },
    },

    // Path configuration
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
