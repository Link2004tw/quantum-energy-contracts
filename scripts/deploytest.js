const { ethers } = require("hardhat");

const addEnergy = async (energyContract, signer, energy) => {
    // Use the signer to connect to the contract
    const contractWithSigner = energyContract.connect(signer);

    // Request energy addition
    await contractWithSigner.requestAddEnergy(energy);

    // Advance blockchain time
    const requestBlock = await ethers.provider.getBlock("latest");
    const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
    await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
    await ethers.provider.send("evm_mine");

    // Confirm energy addition
    await contractWithSigner.confirmAddEnergy(energy);
};

async function main() {
    const [deployer] = await ethers.getSigners();
    //console.log("Deploying contracts with account:", deployer.address);

    // Deploy MockV3Aggregator for local testing
    let priceFeedAddress;
    const network = await ethers.provider.getNetwork();
    console.log("Network chainId:", network.chainId);
    console.log(network.toJSON());
    // Hardhat local network
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockPriceFeed = await MockV3Aggregator.deploy(8, 2000 * 10 ** 8); // 8 decimals, 2000 USD/ETH
    await mockPriceFeed.waitForDeployment();
    priceFeedAddress = await mockPriceFeed.getAddress();
    //consol.log("MockV3Aggregator deployed to:", priceFeedAddress);

    // Deploy EnergyContract
    const EnergyContract = await ethers.getContractFactory("EnergyContract");
    //console.log("Deploying EnergyContract...");
    const energyContract = await EnergyContract.deploy(priceFeedAddress, deployer.address, {
        gasLimit: 7000000,
    });
    await energyContract.waitForDeployment();
    const contractAddress = await energyContract.getAddress();
    //consol.log("EnergyContract deployed to:", contractAddress);

    // Test solarFarm state variable
    const solarFarm = await energyContract.solarFarm();

    await addEnergy(energyContract, deployer, 1000);
    await addEnergy(energyContract, deployer, 1000);

    // Test getLatestEthPrice
    try {
        //console.log(await energyContract.getLatestEthPrice2());
        await energyContract.getLatestEthPrice();
        const ethPrice = await energyContract.getCachedEthPrice();
        // console.log("ETH/USD price:", ethers.formatUnits(ethPrice, 8));
    } catch (error) {
        console.error("Error calling getLatestEthPrice:", error);
        if (error.reason) {
            console.error("Revert reason:", error.reason);
        }
    }

    await energyContract.getLatestEthPrice();
    const newPrice = await energyContract.getCachedEthPrice();
    // console.log("New ETH/USD price:", ethers.formatUnits(newPrice, 8));
    //test cost calculation
    const cost = await energyContract.calculateRequiredPayment(10, 4200 * 10 ** 8);
    console.log(cost);
    await energyContract.connect(deployer).authorizeParty("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    const answer = await energyContract.checkAuthState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    console.log(answer);
    console.log(await mockPriceFeed.getAddress());
    console.log(await energyContract.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
