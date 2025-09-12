// scripts/checkEthUsdPriceFeed.js
// Prompt: Check if Sepolia ETH/USD price feed updates to handle PriceFeedStale error
const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`
  );
  const priceFeed = new ethers.Contract(
    "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
    [
      "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
    ],
    provider
  );
  const [roundId, price, startedAt, updatedAt, answeredInRound] =
    await priceFeed.latestRoundData();
  console.log({
    roundId: roundId.toString(),
    price: ethers.formatUnits(price, 8),
    updatedAt:
      updatedAt > 0
        ? new Date(Number(updatedAt) * 1000).toISOString()
        : "Invalid",
    isRecent:
      updatedAt > 0 && Math.floor(Date.now() / 1000) <= Number(updatedAt) + 900,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
