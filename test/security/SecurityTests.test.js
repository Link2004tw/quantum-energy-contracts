const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security Attack Vectors", function () {
  let EnergyContract, MaliciousContract, MockV3Aggregator;
  let energyContract, maliciousContract, mockPriceFeed;
  let owner, solarFarm, buyer, attacker;
  const PRICE_PER_KWH_USD_CENTS = 12;
  const MAX_KWH_PER_PURCHASE = 1000;
  const INITIAL_KWH = 1000;
  const ETH_PRICE_USD = 2000 * 10 ** 8; // $2000 with 8 decimals

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

  const addEnergy = async (contract = energyContract, energy = 1000) => {
    await contract.connect(solarFarm).requestAddEnergy(energy);
    const requestBlock = await ethers.provider.getBlock("latest");
    const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
    await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
    await ethers.provider.send("evm_mine");
    await contract.connect(solarFarm).confirmAddEnergy(energy);
  };

  const authorizeParty = async (partyAddress) => {
    return await energyContract.connect(solarFarm).authorizeParty(partyAddress);
  };

  const getHashedCommitment = (kWh, nonce, sender) => {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256", "address"],
        [kWh, nonce, sender]
      )
    );
  };

  const advanceTime = async (seconds) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  };

  beforeEach(async function () {
    [owner, solarFarm, buyer, attacker] = await ethers.getSigners();

    // Deploy MockV3Aggregator
    MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockPriceFeed = await MockV3Aggregator.deploy(8, ETH_PRICE_USD);
    await mockPriceFeed.waitForDeployment();

    // Deploy EnergyContract
    EnergyContract = await ethers.getContractFactory("EnergyContract");
    energyContract = await EnergyContract.deploy(
      await mockPriceFeed.getAddress(),
      solarFarm.address
    );
    await energyContract.waitForDeployment();

    // Add initial energy
    await addEnergy();
    // Authorize buyer
    await authorizeParty(buyer.address);
    //await energyContract.connect(solarFarm).authorizeParty(buyer.address);
  });

  it("Should prevent reentrancy attacks on payment functions", async function () {
    // Deploy MaliciousContract
    const MaliciousContract = await ethers.getContractFactory(
      "MaliciousContract"
    );
    maliciousContract = await MaliciousContract.deploy(
      await energyContract.getAddress()
    );
    await maliciousContract.waitForDeployment();
    const maliciousAddress = await maliciousContract.getAddress();

    // Authorize malicious contract as a party
    await energyContract.connect(solarFarm).authorizeParty(maliciousAddress);

    // Prepare commitment
    const kWh = 100;
    const nonce = 12345;
    const commitmentHash = getHashedCommitment(kWh, nonce, maliciousAddress);

    // Commit purchase
    // Calculate required payment
    //const totalCostUSDCents = kWh * PRICE_PER_KWH_USD_CENTS;
    const payment = await calculatePayment(kWh, 2000);
    console.log(payment);
    const excessValue = payment * BigInt(2); // Send excess ETH to create refund
    //const totalCostWei = (totalCostUSDCents * 10 ** 18) / (ETH_PRICE_USD / 10 ** 2);
    const commitBlock = await ethers.provider.getBlock("latest");
    const commitTimestamp = commitBlock.timestamp + 1;
    await ethers.provider.send("evm_setNextBlockTimestamp", [commitTimestamp]);
    console.log(maliciousAddress);
    await maliciousContract.connect(attacker).commitPurchase(commitmentHash);
    // Perform purchase with excess ETH to generate a refund

    const commitment = await energyContract.purchaseCommitments(
      maliciousAddress
    );
    expect(commitment.commitmentHash).to.equal(commitmentHash);
    expect(commitment.timestamp).to.be.gt(0);

    await maliciousContract.connect(attacker).attackRevealPurchase(kWh, nonce, {
      value: excessValue,
      gasLimit: 2000000,
    });

    // Verify refund exists
    const refundAmount = await energyContract.pendingRefunds(maliciousAddress);
    expect(refundAmount).to.equal(excessValue - payment);
    // Verify state after purchase
    const availableKWh = await energyContract.availableKWh();
    expect(availableKWh).to.equal(INITIAL_KWH - kWh);

    // Attempt reentrancy attack via withdrawRefunds
    await expect(
      maliciousContract
        .connect(attacker)
        .attackWithdrawRefunds({ gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(EnergyContract, "PaymentFailed");
    // Verify state: refund amount unchanged, no additional kWh deducted
    const finalRefundAmount = await energyContract.pendingRefunds(
      maliciousAddress
    );
    expect(finalRefundAmount).to.equal(excessValue - payment);

    const finalAvailableKWh = await energyContract.availableKWh();
    expect(finalAvailableKWh).to.equal(INITIAL_KWH - kWh);
  });

  it("Should handle unauthorized access attempts", async function () {
    // Test all access control bypasses
    // Deploy MaliciousContract
    const MaliciousContract = await ethers.getContractFactory(
      "MaliciousContract"
    );
    maliciousContract = await MaliciousContract.deploy(
      await energyContract.getAddress()
    );
    await maliciousContract.waitForDeployment();

    // Do NOT authorize malicious contract to simulate unauthorized access

    // Prepare commitment to create a refund
    const kWh = 100;
    const nonce = 12345;
    const commitmentHash = getHashedCommitment(kWh, nonce, buyer.address);

    // Commit purchase as buyer (authorized)
    await energyContract
      .connect(buyer)
      .commitPurchase(commitmentHash, { gasLimit: 1000000 });
    const payment = await calculatePayment(kWh, 2000);
    const excessValue = payment * BigInt(2); // Send excess ETH to create refund

    // Perform purchase with excess ETH as buyer to generate a refund
    await energyContract.connect(buyer).revealPurchase(kWh, nonce, {
      value: excessValue,
      gasLimit: 1000000,
    });

    // Verify refund exists for buyer
    const refundAmount = await energyContract.pendingRefunds(buyer.address);
    expect(refundAmount).to.equal(excessValue - payment);

    // Transfer refund to malicious contract (simulating a scenario where refund exists)

    // Test 1: Unauthorized access to withdrawRefunds
    await expect(
      maliciousContract
        .connect(attacker)
        .attackWithdrawRefunds({ gasLimit: 8000000 })
    ).to.be.revertedWithCustomError(EnergyContract, "NoRefundsAvailable");

    // Test 2: Unauthorized access to requestAddEnergy
    await expect(
      energyContract
        .connect(attacker)
        .requestAddEnergy(1000, { gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(
      EnergyContract,
      "OwnableUnauthorizedAccount"
    );

    // Test 3: Unauthorized access to confirmAddEnergy
    await expect(
      energyContract
        .connect(attacker)
        .confirmAddEnergy(1000, { gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(
      EnergyContract,
      "OwnableUnauthorizedAccount"
    );
    // Test 4: Unauthorized access to pause (owner-only)
    await expect(
      energyContract.connect(attacker).pause({ gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(
      EnergyContract,
      "OwnableUnauthorizedAccount"
    );

    await expect(
      energyContract.connect(attacker).unpause({ gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(
      EnergyContract,
      "OwnableUnauthorizedAccount"
    );

    await expect(
      energyContract
        .connect(attacker)
        .authorizeParty(attacker.address, { gasLimit: 1000000 })
    ).to.be.revertedWithCustomError(
      EnergyContract,
      "OwnableUnauthorizedAccount"
    );
    // Verify state: refund amount unchanged, no additional kWh added or deducted
    expect(await energyContract.availableKWh()).to.equal(INITIAL_KWH - kWh);
  });

  it("Should resist price manipulation attacks", async function () {
    // Test with extreme price scenarios
    const kWh = 100;
    const nonce = 12345;
    const commitmentHash = getHashedCommitment(kWh, nonce, buyer.address);

    // Test 1: Invalid price (below bounds, 50 USD)
    await mockPriceFeed.updateAnswer(50 * 10 ** 8); // Set price to 50 USD
    await energyContract.connect(buyer).commitPurchase(commitmentHash);
    await expect(
      energyContract.connect(buyer).revealPurchase(kWh, nonce, {
        value: ethers.parseEther("1"),
        gasLimit: 1000000,
      })
    ).to.be.revertedWithCustomError(energyContract, "InvalidPriceBounds");

    // Test 2: Invalid price (above bounds, 15,000 USD)
    await mockPriceFeed.updateAnswer(15000 * 10 ** 8); // Set price to 15,000 USD
    await expect(
      energyContract.connect(buyer).revealPurchase(kWh, nonce, {
        value: ethers.parseEther("1"),
        gasLimit: 1000000,
      })
    ).to.be.revertedWithCustomError(energyContract, "InvalidPriceBounds");

    // Test 3: Stale price feed
    await mockPriceFeed.updateAnswer(ETH_PRICE_USD); // Set valid price
    const currentBlock = await ethers.provider.getBlock("latest");
    await mockPriceFeed.updateRoundData(
      1, // roundId
      ETH_PRICE_USD,
      currentBlock.timestamp, // 16 minutes ago (past STALENESS_THRESHOLD)
      currentBlock.timestamp
    );

    await energyContract.getLatestEthPrice(); // Cache the price
    //console.log(await energyContract.getCachedEthPrice());
    advanceTime(16*60); // Advance time to make the price stale
    //console.log("Test 3 - Price feed");
    await energyContract.connect(buyer).commitPurchase(commitmentHash);
    
    await expect(
      energyContract.connect(buyer).revealPurchase(kWh, nonce, {
        value: ethers.parseEther("1"),
        gasLimit: 1000000,
      })
    ).to.be.revertedWithCustomError(energyContract, "PriceFeedStale");

    // Advance time again
    await advanceTime(301);
    // Test 4: Cached price fallback
    await mockPriceFeed.updateAnswer(ETH_PRICE_USD);
    await energyContract.getLatestEthPrice();
    await mockPriceFeed.updateAnswer(-100 * 10 ** 8);
    await energyContract.connect(buyer).commitPurchase(commitmentHash);
    const payment = await calculatePayment(kWh, 2000);
    await energyContract.connect(buyer).revealPurchase(kWh, nonce, {
      value: payment,
      gasLimit: 1000000,
    });
    expect(await energyContract.availableKWh()).to.equal(INITIAL_KWH - kWh);

    await advanceTime(301);

    // Test 5: No cached price, invalid Chainlink price
    const manipulatedEnergyContractFresh = await EnergyContract.deploy(
      await mockPriceFeed.getAddress(),
      solarFarm.address
    );
    await manipulatedEnergyContractFresh.waitForDeployment();
    await addEnergy(manipulatedEnergyContractFresh);
    await manipulatedEnergyContractFresh
      .connect(solarFarm)
      .authorizeParty(buyer.address);

    // Set price to 0 with a recent timestamp
    const freshBlock = await ethers.provider.getBlock("latest");
    await mockPriceFeed.updateRoundData(
      2, // roundId
      0, // Invalid price (zero)
      freshBlock.timestamp, // Recent timestamp to avoid staleness
      2 // answeredInRound
    );
    // Verify price feed state
    const roundData = await mockPriceFeed.latestRoundData();
    console.log("Test 5 - Price feed updatedAt:", roundData[3].toString());
    console.log(
      "Test 5 - Current block timestamp:",
      (await ethers.provider.getBlock("latest")).timestamp
    );

    await manipulatedEnergyContractFresh
      .connect(buyer)
      .commitPurchase(commitmentHash);
    await expect(
      manipulatedEnergyContractFresh.connect(buyer).revealPurchase(kWh, nonce, {
        value: ethers.parseEther("1"),
        gasLimit: 1000000,
      })
    ).to.be.revertedWithCustomError(
      manipulatedEnergyContractFresh,
      "InvalidEthPrice"
    );
  });
});
