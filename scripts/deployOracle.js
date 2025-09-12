// Prompt: Create a deployment script for UraniumPriceConsumer to Sepolia
// This is a new Hardhat deployment script for the UraniumPriceConsumer contract (artifact_id: d3ad1578-8445-4b94-93ee-cd5fe46b4b2b, version_id: b11a0750-8bde-4cbb-a490-3cde84753f3f).
// Changes made:
// - Created a new ES module script to deploy the contract to Sepolia.
// - Included console logs for deployment address and verification instructions.
// - No modifications to the contract itself.

import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    // Deploy UraniumPriceConsumer
    const UraniumPriceConsumer = await ethers.getContractFactory("UraniumPriceConsumer");
    const uraniumPriceConsumer = await UraniumPriceConsumer.deploy();
    await uraniumPriceConsumer.waitForDeployment();
    const contractAddress = await uraniumPriceConsumer.getAddress();
    console.log("UraniumPriceConsumer deployed to:", contractAddress);

    // Log instructions for verification and funding
    console.log("Verify contract on Etherscan: npx hardhat verify --network sepolia", contractAddress);
    console.log("Fund contract with Sepolia LINK at https://faucets.chain.link/sepolia");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
