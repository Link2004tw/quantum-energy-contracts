require("@nomicfoundation/hardhat-toolbox");
const { config: configDotenv } = require("dotenv");

configDotenv();

const privateKey = process.env.PRIVATE_KEY?.startsWith("0x")
  ? process.env.PRIVATE_KEY
  : `0x${process.env.PRIVATE_KEY}`;
const testingAccountPrivateKey =
  process.env.TESTING_ACCOUNT_PRIVATE_KEY?.startsWith("0x")
    ? process.env.TESTING_ACCOUNT_PRIVATE_KEY
    : `0x${process.env.TESTING_ACCOUNT_PRIVATE_KEY}`;
const authenticatedPrivateKey =
  process.env.AUTHENTICATED_PRIVATE_KEY?.startsWith("0x")
    ? process.env.AUTHENTICATED_PRIVATE_KEY
    : `0x${process.env.AUTHENTICATED_PRIVATE_KEY}`;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.30",
  networks: {
    hardhat: {
      chainId: 31337,
      chainType: "l1",
      forking: {
        url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
        blockNumber: 9180983, // From your transaction
      },
      accounts: [
        {
          privateKey: privateKey, // your PK as string
          balance: "10000000000000000000000", // (optional) 10,000 ETH
        },
        {
          privateKey: testingAccountPrivateKey, // your PK as string
          balance: "10000000000000000000000", // (optional) 10,000 ETH
        },
        {
          privateKey: authenticatedPrivateKey, // your PK as string
          balance: "10000000000000000000000", // (optional) 10,000 ETH
        },
      ], // Use same private key as Sepolia for consistency
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      rpcUrl: "http://127.0.0.1:8545",
      currency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: [],
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
      accounts: [
        privateKey,
        testingAccountPrivateKey,
        authenticatedPrivateKey,
      ].filter(Boolean),
      gas: "auto",
      gasPrice: "auto",
      chainId: 11155111,
    },
  },
};
