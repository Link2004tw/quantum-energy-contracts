// Prompt: Modify the Hardhat deployment script to work with a Sepolia testnet fork, using the real Chainlink ETH/USD price feed instead of deploying a MockV3Aggregator.
// Prompt: Update deploy.js for Sepolia deployment to fix HH605 and PriceFeedStale errors, including Etherscan verification
const { ethers, run } = require("hardhat");

// const addEnergy = async (energyContract, signer, energy) => {
//   const contractWithSigner = energyContract.connect(signer);
//   // Request energy addition
//   console.log("Requesting addEnergy...");
//   const tx = await contractWithSigner.requestAddEnergy(energy);
//   await tx.wait(); // Wait for transaction confirmation on live Sepolia
//   console.log("addEnergy requested:", tx.hash);

//   // Confirm energy addition (ensure contract handles delays appropriately)
//   console.log("Confirming addEnergy...");
//   const confirmTx = await contractWithSigner.confirmAddEnergy(energy);
//   await confirmTx.wait();
//   console.log("addEnergy confirmed:", confirmTx.hash);
// };

// const addEnergy = async (energyContract, signer, energy) => {
//   // Use the signer to connect to the contract
//   const contractWithSigner = energyContract.connect(signer);

//   // Request energy addition
//   await contractWithSigner.requestAddEnergy(energy);

//   // Advance blockchain time
//   const requestBlock = await ethers.provider.getBlock("latest");
//   const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
//   await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
//   await ethers.provider.send("evm_mine");

//   // Confirm energy addition
//   await contractWithSigner.confirmAddEnergy(energy);
// };
async function main() {
    // Debug: Log network and deployer details
    const network = await ethers.provider.getNetwork();
    console.log("Network chainId:", network.chainId);
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

    // Check balance for deployment
    if (balance === 0n) {
        throw new Error("Deployer has 0 ETH. Fund the account with Sepolia ETH from a faucet.");
    }

    // Use the real Chainlink ETH/USD price feed address for Sepolia
    const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD price feed

    // Deploy EnergyContract
    const EnergyContract = await ethers.getContractFactory("EnergyContract");
    console.log("Deploying EnergyContract to Sepolia...");
    const energyContract = await EnergyContract.deploy(priceFeedAddress, deployer.address, { gasLimit: 7000000 });
    await energyContract.waitForDeployment();
    const contractAddress = await energyContract.getAddress();
    console.log("EnergyContract deployed to:", contractAddress);

    // Verify contract on Sepolia Etherscan
    console.log("Verifying contract on Etherscan...");
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: [priceFeedAddress, deployer.address],
        });
        console.log(
            "Contract verified successfully! View at:",
            `https://sepolia.etherscan.io/address/${contractAddress}`,
        );
    } catch (error) {
        console.error("Verification failed:", error.message);
    }

    // Test solarFarm state variable
    const solarFarm = await energyContract.solarFarm();
    console.log("SolarFarm:", solarFarm);

    // Test addEnergy functionality
    //await addEnergy(energyContract, deployer, 1000);
    //await addEnergy(energyContract, deployer, 1000);

    // Test getLatestEthPrice
    try {
        console.log("Calling getLatestEthPrice...");
        const tx = await energyContract.getLatestEthPrice();
        await tx.wait();
        const ethPrice = await energyContract.getCachedEthPrice();
        console.log("ETH/USD price from contract:", ethers.formatUnits(ethPrice, 8));
    } catch (error) {
        console.error("Error calling getLatestEthPrice:", error.message);
        if (error.reason) {
            console.error("Revert reason:", error.reason);
        }
    }

    // Test cost calculation
    const cost = await energyContract.calculateRequiredPayment(12, 2000 * 10 ** 8);
    console.log("Calculated cost:", ethers.formatEther(cost), "ETH");

    // Test authorization
    const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    console.log("Authorizing test address...");
    const authTx = await energyContract.connect(deployer).authorizeParty(testAddress);
    await authTx.wait();
    const answer = await energyContract.checkAuthState(testAddress);
    console.log("Authorization state for", testAddress, ":", answer);

    //console.log("Price Feed Address:", priceFeedAddress);
    console.log("EnergyContract Address:", contractAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
