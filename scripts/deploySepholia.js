// // Prompt: Modify the Hardhat deployment script to work with a Sepolia testnet fork, using the real Chainlink ETH/USD price feed instead of deploying a MockV3Aggregator.
// // Prompt: Update deploy.js for Sepolia deployment to fix HH605 and PriceFeedStale errors, including Etherscan verification
// const { ethers, run } = require("hardhat");

// // const addEnergy = async (energyContract, signer, energy) => {
// //   const contractWithSigner = energyContract.connect(signer);
// //   // Request energy addition
// //   console.log("Requesting addEnergy...");
// //   const tx = await contractWithSigner.requestAddEnergy(energy);
// //   await tx.wait(); // Wait for transaction confirmation on live Sepolia
// //   console.log("addEnergy requested:", tx.hash);

// //   // Confirm energy addition (ensure contract handles delays appropriately)
// //   console.log("Confirming addEnergy...");
// //   const confirmTx = await contractWithSigner.confirmAddEnergy(energy);
// //   await confirmTx.wait();
// //   console.log("addEnergy confirmed:", confirmTx.hash);
// // };

// // const addEnergy = async (energyContract, signer, energy) => {
// //   // Use the signer to connect to the contract
// //   const contractWithSigner = energyContract.connect(signer);

// //   // Request energy addition
// //   await contractWithSigner.requestAddEnergy(energy);

// //   // Advance blockchain time
// //   const requestBlock = await ethers.provider.getBlock("latest");
// //   const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
// //   await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
// //   await ethers.provider.send("evm_mine");

// //   // Confirm energy addition
// //   await contractWithSigner.confirmAddEnergy(energy);
// // };
// async function main() {
//     // Debug: Log network and deployer details
//     const network = await ethers.provider.getNetwork();
//     console.log("Network chainId:", network.chainId);
//     const [deployer] = await ethers.getSigners();
//     console.log("Deployer address:", deployer.address);
//     const balance = await ethers.provider.getBalance(deployer.address);
//     console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

//     // Check balance for deployment
//     if (balance === 0n) {
//         throw new Error("Deployer has 0 ETH. Fund the account with Sepolia ETH from a faucet.");
//     }

//     // Use the real Chainlink ETH/USD price feed address for Sepolia
//     const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD price feed

//     // Deploy EnergyContract
//     const EnergyContract = await ethers.getContractFactory("EnergyContract");
//     console.log("Deploying EnergyContract to Sepolia...");
//     const energyContract = await EnergyContract.deploy(priceFeedAddress, "0x3998FF27EB77a6f29b4b4624d6F785264E43f5eF", {
//         gasLimit: 7000000,
//     });
//     await energyContract.waitForDeployment();
//     const contractAddress = await energyContract.getAddress();
//     console.log("EnergyContract deployed to:", contractAddress);

//     // Verify contract on Sepolia Etherscan
//     console.log("Verifying contract on Etherscan...");
//     try {
//         await run("verify:verify", {
//             address: contractAddress,
//             constructorArguments: [priceFeedAddress, deployer.address],
//         });
//         console.log(
//             "Contract verified successfully! View at:",
//             `https://sepolia.etherscan.io/address/${contractAddress}`,
//         );
//     } catch (error) {
//         console.error("Verification failed:", error.message);
//     }

//     // Test solarFarm state variable
//     const solarFarm = await energyContract.solarFarm();
//     console.log("SolarFarm:", solarFarm);

//     // Test addEnergy functionality
//     //await addEnergy(energyContract, deployer, 1000);
//     //await addEnergy(energyContract, deployer, 1000);

//     // Test getLatestEthPrice
//     try {
//         console.log("Calling getLatestEthPrice...");
//         const tx = await energyContract.getLatestEthPrice();
//         await tx.wait();
//         const ethPrice = await energyContract.getCachedEthPrice();
//         console.log("ETH/USD price from contract:", ethers.formatUnits(ethPrice, 8));
//         const cost = await energyContract.calculateRequiredPayment(12, ethPrice);
//         console.log("Calculated cost:", ethers.formatEther(cost), "ETH");
//     } catch (error) {
//         console.error("Error calling getLatestEthPrice:", error.message);
//         if (error.reason) {
//             console.error("Revert reason:", error.reason);
//         }
//     }

//     // Test cost calculation

//     // Test authorization
//     const testAddress = "0xE54410F418e9Cc47191B7b1bC683CAe02cB5ABc5";
//     console.log("Authorizing test address...");
//     const authTx = await energyContract.connect(deployer).authorizeParty(testAddress);
//     await authTx.wait();
//     const answer = await energyContract.checkAuthState(testAddress);
//     console.log("Authorization state for", testAddress, ":", answer);

//     //console.log("Price Feed Address:", priceFeedAddress);
//     console.log("EnergyContract Address:", contractAddress);

// }

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });

// Prompt: Modify the Hardhat deployment script to work with a Sepolia testnet fork, using the real Chainlink ETH/USD price feed.
// Prompt: Update deploy.js for Sepolia deployment to fix HH605 and PriceFeedStale errors, including Etherscan verification
// CHANGED: Added addEnergy function with 2-minute delay handling, gas limits, error handling, and logging for Sepolia fork

const { ethers, run, network } = require("hardhat");

async function addEnergy(energyContract, signer, energy) {
    const contractWithSigner = energyContract.connect(signer);

    // CHANGED: Added error handling and explicit gas limits to prevent HH605
    try {
        console.log(`Requesting addEnergy for ${energy} kWh...`);
        const requestTx = await contractWithSigner.requestAddEnergy(energy, {
            gasLimit: 300000, // Set reasonable gas limit for request
        });
        const requestReceipt = await requestTx.wait();
        console.log(`addEnergy requested: ${requestReceipt.hash}`);

        // CHANGED: Advance blockchain time by 2 minutes + 1 second for ADD_ENERGY_DELAY
        const requestBlock = await ethers.provider.getBlock("latest");
        const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
        await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
        await ethers.provider.send("evm_mine");
        console.log(`Blockchain time advanced to ${confirmTimestamp}`);

        console.log(`Confirming addEnergy for ${energy} kWh...`);
        const confirmTx = await contractWithSigner.confirmAddEnergy(energy, {
            gasLimit: 300000, // Set reasonable gas limit for confirmation
        });
        const confirmReceipt = await confirmTx.wait();
        console.log(`addEnergy confirmed: ${confirmReceipt.hash}`);
    } catch (error) {
        console.error("Error in addEnergy:", error.message);
        if (error.reason) console.error("Revert reason:", error.reason);
        throw error;
    }
}

async function main() {
    // CHANGED: Ensure Sepolia fork network is used
    console.log("Network name:", network.name);
    console.log("Network chainId:", network.config.chainId);
    if (network.config.chainId !== 11155111) {
        throw new Error("Must run on Sepolia testnet fork (chainId 11155111)");
    }

    // CHANGED: Check deployer balance and nonce to prevent HH605
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
    const nonce = await ethers.provider.getTransactionCount(deployer.address);
    console.log("Deployer nonce:", nonce);

    if (balance === 0n) {
        throw new Error("Deployer has 0 ETH. Fund the account with Sepolia ETH from a faucet.");
    }

    // Use real Chainlink ETH/USD price feed for Sepolia
    const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD price feed
    const solarFarmAddress = "0x3998FF27EB77a6f29b4b4624d6F785264E43f5eF";

    // CHANGED: Deploy with explicit gas limit to avoid HH605
    const EnergyContract = await ethers.getContractFactory("EnergyContract");
    console.log("Deploying EnergyContract to Sepolia fork...");
    const energyContract = await EnergyContract.deploy(priceFeedAddress, solarFarmAddress, {
        gasLimit: 7000000,
    });
    await energyContract.waitForDeployment();
    const contractAddress = await energyContract.getAddress();
    console.log("EnergyContract deployed to:", contractAddress);

    // CHANGED: Verify contract on Sepolia Etherscan with delay to avoid rate limits
    console.log("Verifying contract on Etherscan...");
    try {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s to ensure deployment is indexed
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: [priceFeedAddress, solarFarmAddress],
        });
        console.log(
            "Contract verified successfully! View at:",
            `https://sepolia.etherscan.io/address/${contractAddress}`,
        );
    } catch (error) {
        console.error("Verification failed:", error.message);
        console.log("Ensure ETHERSCAN_API_KEY is set in .env and contract is not already verified.");
    }

    // Test solarFarm state variable
    const solarFarm = await energyContract.solarFarm();
    console.log("SolarFarm:", solarFarm);

    // CHANGED: Test addEnergy with 100 kWh
    try {
        await addEnergy(energyContract, deployer, 100);
        console.log("Available kWh after addEnergy:", (await energyContract.availableKWh()).toString());
    } catch (error) {
        console.error("addEnergy test failed:", error.message);
    }

    // Test getLatestEthPrice to check for PriceFeedStale
    try {
        console.log("Calling getLatestEthPrice...");
        const priceTx = await energyContract.getLatestEthPrice({ gasLimit: 200000 });
        await priceTx.wait();
        const ethPrice = await energyContract.getCachedEthPrice();
        console.log("ETH/USD price from contract:", ethers.formatUnits(ethPrice, 18)); // 18 decimals from contract
        const cost = await energyContract.calculateRequiredPayment(100, ethPrice / 10 ** 10);
        console.log("Calculated cost for 100 kWh:", ethers.formatEther(cost), "ETH");
    } catch (error) {
        console.error("Error calling getLatestEthPrice:", error.message);
        if (error.reason) console.error("Revert reason:", error.reason);
        console.log("Check if Chainlink price feed is stale or fork is outdated.");
    }

    // Test authorization
    const testAddress = "0xE54410F418e9Cc47191B7b1bC683CAe02cB5ABc5";
    console.log("Authorizing test address...");
    try {
        const authTx = await energyContract.connect(deployer).authorizeParty(testAddress, { gasLimit: 200000 });
        await authTx.wait();
        const isAuthorized = await energyContract.checkAuthState(testAddress);
        console.log("Authorization state for", testAddress, ":", isAuthorized);
    } catch (error) {
        console.error("Authorization failed:", error.message);
    }

    console.log("Price Feed Address:", priceFeedAddress);
    console.log("EnergyContract Address:", contractAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
