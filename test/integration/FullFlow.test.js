const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Complete Energy Trading Flow", function() {
    let EnergyContract, energyContract, MockV3Aggregator, mockPriceFeed;
    let owner, buyer, solarFarm;
    const MAX_KWH_PER_PURCHASE = 1000;
    const PRICE_PER_KWH_USD_CENTS = 12;

    beforeEach(async function () {
        [owner, buyer, solarFarm] = await ethers.getSigners();
        // Deploy MockV3Aggregator
        MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
        mockPriceFeed = await MockV3Aggregator.deploy(8, BigInt(2000 * 10 ** 8)); // 8 decimals, $2000 ETH/USD
        await mockPriceFeed.waitForDeployment();
        // Deploy EnergyContract
        EnergyContract = await ethers.getContractFactory("EnergyContract");
        energyContract = await EnergyContract.deploy(
            await mockPriceFeed.getAddress(),
            solarFarm.address
        );
        await energyContract.waitForDeployment();
    });

    it("Should handle full purchase cycle correctly", async function() {
        // 1. Solar farm adds energy
        await energyContract.connect(solarFarm).requestAddEnergy(500);
        const requestBlock = await ethers.provider.getBlock("latest");
        const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
        await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
        await ethers.provider.send("evm_mine");
        await energyContract.connect(solarFarm).confirmAddEnergy(500);
        expect(await energyContract.availableKWh()).to.equal(500);

        // 2. Solar farm authorizes buyer
        await energyContract.connect(solarFarm).authorizeParty(buyer.address);
        expect(await energyContract.authorizedParties(buyer.address)).to.equal(true);

        // 3. Buyer commits to purchase
        const kWh = 100;
        const nonce = 12345;
        const commitmentHash = ethers.keccak256(
            ethers.solidityPacked([
                "uint256", "uint256", "address"
            ], [kWh, nonce, buyer.address])
        );
        // Advance time for commit cooldown (if needed)
        await ethers.provider.send("evm_increaseTime", [301]);
        await ethers.provider.send("evm_mine");
        await energyContract.connect(buyer).commitPurchase(commitmentHash);
        // 4. Buyer reveals purchase
        await energyContract.getLatestEthPrice(); // Ensure price is cached
        const ethPriceUSD = await energyContract.getCachedEthPrice();
        const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
        const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
        const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;
        const revealTimestamp = (await ethers.provider.getBlock("latest")).timestamp + 10;
        await ethers.provider.send("evm_setNextBlockTimestamp", [revealTimestamp]);
        const tx = await energyContract.connect(buyer).revealPurchase(kWh, nonce, { value: totalCostWei });
        await expect(tx)
            .to.emit(energyContract, "EnergyPurchased")
            .withArgs(
                buyer.address,
                solarFarm.address,
                kWh,
                totalCostWei,
                ethPriceUSD,
                revealTimestamp
            );
        expect(await energyContract.availableKWh()).to.equal(400);
    });
    
    it("Should handle emergency pause scenarios", async function() {
        // Test pause/unpause during various states
    });
});
