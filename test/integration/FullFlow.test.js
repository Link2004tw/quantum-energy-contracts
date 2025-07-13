const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Complete Energy Trading Flow", function () {
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

  it("Should handle full purchase cycle correctly", async function () {
    // Test: requestAddEnergy → confirmAddEnergy → commitPurchase → revealPurchase

    // Helper to calculate required payment
    const calculatePayment = async (kWh, ethPriceUSD) => {
      const expectedCostWei =
        (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
        (BigInt(ethPriceUSD * 10 ** 8) / BigInt(10 ** 2));
      const payment = await energyContract.calculateRequiredPayment(
        kWh,
        BigInt(ethPriceUSD * 10 ** 8)
      );
      expect(payment).to.equal(expectedCostWei);
      return payment;
    };

    // Step 1: Authorize buyer
    await energyContract.connect(solarFarm).authorizeParty(buyer.address);
    expect(await energyContract.authorizedParties(buyer.address)).to.be.true;

    // Step 2: Add energy (1000 kWh)
    const kWhToAdd = 1000;
    const requestTx = await energyContract
      .connect(solarFarm)
      .requestAddEnergy(kWhToAdd);
    const requestBlock = await ethers.provider.getBlock(requestTx.blockNumber);
    const requestTimestamp = requestBlock.timestamp;
    await expect(requestTx)
      .to.emit(energyContract, "EnergyAddRequested")
      .withArgs(solarFarm.address, kWhToAdd, requestTimestamp);

    // Advance time for confirmAddEnergy (2 minutes + 1 second)
    const confirmTimestamp = requestTimestamp + 120;
    await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
    await ethers.provider.send("evm_mine");
    const confirmTx = await energyContract
      .connect(solarFarm)
      .confirmAddEnergy(kWhToAdd);
    await expect(confirmTx)
      .to.emit(energyContract, "EnergyAdded")
      .withArgs(solarFarm.address, kWhToAdd, confirmTimestamp + 1);
    expect(await energyContract.availableKWh()).to.equal(kWhToAdd);

    // Step 3: Commit purchase
    const kWhToBuy = 100;
    const nonce = 12345;
    const commitmentHash = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256", "address"],
        [kWhToBuy, nonce, buyer.address]
      )
    );
    const commitTx = await energyContract
      .connect(buyer)
      .commitPurchase(commitmentHash);
    const commitBlock = await ethers.provider.getBlock("latest");
    await expect(commitTx)
      .to.emit(energyContract, "EnergyPurchaseCommitted")
      .withArgs(buyer.address, commitmentHash, commitBlock.timestamp);
    console.log("the sender is: %s", buyer.address);

    // Step 4: Reveal purchase
    const ethPriceUSD = 2000;
    const payment = await calculatePayment(kWhToBuy, ethPriceUSD);
    const revealTx = await energyContract
      .connect(buyer)
      .revealPurchase(kWhToBuy, nonce, {
        value: payment,
        gasLimit: 1000000,
      });
    // Verify events and state
    await expect(revealTx)
      .to.emit(energyContract, "PriceCacheUpdated")
      .withArgs(
        BigInt(2000 * 10 ** 8) * BigInt(10 ** 10),
        await ethers.provider.getBlock("latest").then((b) => b.timestamp)
      );
    await expect(revealTx)
      .to.emit(energyContract, "EnergyPurchased")
      .withArgs(
        buyer.address,
        solarFarm.address,
        kWhToBuy,
        payment,
        BigInt(2000 * 10 ** 8) * BigInt(10 ** 10),
        await ethers.provider.getBlock("latest").then((b) => b.timestamp)
      );
    expect(await energyContract.availableKWh()).to.equal(kWhToAdd - kWhToBuy);
    expect(await energyContract.getTransactionsCount()).to.equal(1);
    const tx = await energyContract.getTransaction(0);
    expect(tx.buyer).to.equal(buyer.address);
    expect(tx.seller).to.equal(solarFarm.address);
    expect(tx.kWh).to.equal(kWhToBuy);
    expect(tx.pricePerKWhUSD).to.equal(PRICE_PER_KWH_USD_CENTS);
    expect(tx.ethPriceUSD).to.equal(BigInt(2000 * 10 ** 8) * BigInt(10 ** 10));
  });

  it("Should handle emergency pause scenarios", async function () {
    // Test pause/unpause during various states
    // Authorize buyer
    await energyContract.connect(solarFarm).authorizeParty(buyer.address);

    //-Step 1: Pause during requestAddEnergy
    await energyContract.connect(solarFarm).pause();
    await expect(
      energyContract.connect(solarFarm).requestAddEnergy(1000)
    ).to.be.revertedWithCustomError(EnergyContract, "EnforcedPause");
    await energyContract.connect(solarFarm).unpause();
    const requestTx = await energyContract
      .connect(solarFarm)
      .requestAddEnergy(1000);

    // Step 2: Pause during confirmAddEnergy
    const requestBlock = await ethers.provider.getBlock(requestTx.blockNumber);
    const confirmTimestamp = requestBlock.timestamp + 120 + 1;
    await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
    await ethers.provider.send("evm_mine");
    await energyContract.connect(solarFarm).pause();
    await expect(
      energyContract.connect(solarFarm).confirmAddEnergy(1000)
    ).to.be.revertedWithCustomError(EnergyContract,"EnforcedPause");
    await energyContract.connect(solarFarm).unpause();
    await energyContract.connect(solarFarm).confirmAddEnergy(1000);
    expect(await energyContract.availableKWh()).to.equal(1000);

    // Step 3: Pause during commitPurchase
    await energyContract.connect(solarFarm).pause();
    const commitmentHash = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256", "address"],
        [100, 12345, buyer.address]
      )
    );
    await expect(
      energyContract.connect(buyer).commitPurchase(commitmentHash)
    ).to.be.revertedWithCustomError(EnergyContract, "EnforcedPause");
    await energyContract.connect(solarFarm).unpause();
    await energyContract.connect(buyer).commitPurchase(commitmentHash);

    // Step 4: Pause during revealPurchase
    await energyContract.connect(solarFarm).pause();
    await expect(
      energyContract
        .connect(buyer)
        .revealPurchase(100, 12345, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWithCustomError(EnergyContract, "EnforcedPause");
    await energyContract.connect(solarFarm).unpause();
    const payment = await energyContract.calculateRequiredPayment(
      100,
      BigInt(2000 * 10 ** 8)
    );
    await energyContract
      .connect(buyer)
      .revealPurchase(100, 12345, { value: payment });
    expect(await energyContract.availableKWh()).to.equal(900);
  });
});
