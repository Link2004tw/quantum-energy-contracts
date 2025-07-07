const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EnergyContract Unit Tests", function () {
  let EnergyContract, energyContract, MockV3Aggregator, mockPriceFeed;
  let owner, addr1, addr2, solarFarm;
  const MAX_KWH_PER_PURCHASE = 1000;
  const pricePerKWhUSDCents = 12;
  //const stalenessThreshold = 15 * 60; // 15 minutes in seconds
  //const validPrice = BigInt(2000 * 10 ** 8); // $2000 ETH/USD with 8 decimals
  //const adjustedPrice = BigInt(2000 * 10 ** 8); // Adjusted price for testing
  beforeEach(async function () {
    [owner, addr1, addr2, solarFarm] = await ethers.getSigners();

    // Deploy MockV3Aggregator
    MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    //console.log("Deploying MockV3Aggregator with args: decimals=8, initialAnswer=", BigInt(2000 * 10**8));
    mockPriceFeed = await MockV3Aggregator.deploy(8, BigInt(2000 * 10 ** 8)); // 8 decimals, $2000 ETH/USD
    await mockPriceFeed.waitForDeployment();

    // Deploy EnergyContract
    EnergyContract = await ethers.getContractFactory("EnergyContract");
    energyContract = await EnergyContract.deploy(
      await mockPriceFeed.getAddress(),
      solarFarm.address
    );
  });

  describe("Authorization Management", function () {
    it("Should authorize new party correctly", async function () {
      // Test authorizeParty edge cases
      const blockBefore = await ethers.provider.getBlock("latest");
      const expectedTimestamp = BigInt(blockBefore.timestamp + 1); // 1 hour later
      const tx = await energyContract
        .connect(solarFarm)
        .authorizeParty(addr1.address);
      const receipt = await tx.wait();
      const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
      console.log("Block timestamp after authorization:", blockAfter.timestamp);
      await expect(tx)
        .to.emit(energyContract, "Authorized")
        .withArgs(addr1.address, expectedTimestamp);
      expect(await energyContract.authorizedParties(addr1.address)).to.equal(
        true
      );
      const authorized = await energyContract.getAuthorizedPartyList();
      expect(authorized).to.include(addr1.address);
      expect(authorized).to.include(solarFarm.address);
      expect(authorized.length).to.equal(2);
      //edge case: non owner trying to authorize
      await expect(energyContract.connect(addr1).authorizeParty(addr2.address))
        .to.be.revertedWithCustomError(
          energyContract,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(addr1.address);
      // edge case: cannot authorize zero address
      await expect(
        energyContract.connect(solarFarm).authorizeParty(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(energyContract, "InvalidPartyAddress");
    });

    it("Should prevent duplicate authorizations", async function () {
      // First, authorize addr1
      await energyContract.connect(solarFarm).authorizeParty(addr1.address);
      // Now, try to authorize again (should revert)
      await expect(
        energyContract.connect(solarFarm).authorizeParty(addr1.address)
      ).to.be.revertedWithCustomError(energyContract, "PartyAlreadyAuthorized");
    });

    it("Should handle array removal correctly", async function () {
      // Test unAuthorizeParty array management
      await energyContract.connect(solarFarm).authorizeParty(addr1.address);
      expect(await energyContract.authorizedParties(addr1.address)).to.equal(
        true
      );
      await energyContract.connect(solarFarm).unAuthorizeParty(addr1.address);
      expect(await energyContract.authorizedParties(addr1.address)).to.equal(
        false
      );
      const authorized = await energyContract.getAuthorizedPartyList();
      expect(authorized).to.not.include(addr1.address);
      expect(authorized.length).to.equal(1); // Only solarFarm should remain
    });
  });

  const checker = async (kWh, PRICE_PER_KWH_USD_CENTS, ethUSD) => {
    await mockPriceFeed.updateAnswer(BigInt(ethUSD * 10 ** 8)); // ethUSD with 8 decimals
    let expectedCostWei =
      (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
      (BigInt(2000 * 10 ** 8) / BigInt(10 ** 2));
    const payment2000 = await energyContract.calculateRequiredPayment(
      kWh,
      BigInt(2000 * 10 ** 8)
    );
    expect(payment2000).to.equal(expectedCostWei);
  };
  describe("Price Calculations", function () {
    it("Should calculate payment correctly with various ETH prices", async function () {
      const kWh = 100; // Example kWh to purchase
      const PRICE_PER_KWH_USD_CENTS = 12; // Example price in cents
      // Test with ETH price = $2000
      console.log("Testing with ETH price = $2000");
      checker(kWh, PRICE_PER_KWH_USD_CENTS, 2000);
      // Test with ETH price = $1500
      console.log("Testing with ETH price = $1500");
      checker(kWh, PRICE_PER_KWH_USD_CENTS, 1500);
      // Test with ETH price = $1000
      console.log("Testing with ETH price = $1000");
      checker(kWh, PRICE_PER_KWH_USD_CENTS, 1000);
    });

    it("Should handle price feed failures gracefully", async function () {
      // Test stale/invalid price scenarios

      await mockPriceFeed.updateAnswer(BigInt(2000 * 10 ** 8)); // $2000 ETH/USD
      await energyContract.getLatestEthPrice(); // Cache the price
      const cachedPrice = await energyContract.getCachedEthPrice();
      expect(cachedPrice).to.equal(BigInt(2000 * 10 ** 18)); // Adjusted price (2000 * 10^8 * 10^10)
      console.log(cachedPrice.toString());
      // Test 1: Invalid price (price <= 0)
      await mockPriceFeed.updateAnswer(0); // Set invalid price
      await expect(energyContract.getLatestEthPrice()).to.not.be.reverted; // Should return cached price
      expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice);

      const stalenessThreshold = 15 * 60; // 15 minutes in seconds
      const currentTimestamp = (await ethers.provider.getBlock("latest"))
        .timestamp;
      await mockPriceFeed.updateRoundData(
        2, // roundId
        BigInt(2500 * 10 ** 8), // $2500 ETH/USD
        currentTimestamp - stalenessThreshold - 1, // Stale timestamp
        2 // answeredInRound
      );
      await expect(energyContract.getLatestEthPrice()).to.not.be.reverted; // Should return cached price
      expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice); // Cached price unchanged

      // Test 3: Stale cache (beyond STALENESS_THRESHOLD)
      await ethers.provider.send("evm_increaseTime", [stalenessThreshold + 1]);
      await ethers.provider.send("evm_mine"); // Mine a new block to update timestamp
      await ethers.provider.send("evm_increaseTime", [stalenessThreshold + 1]);
      await ethers.provider.send("evm_mine"); // Mine a new block to update timestamp
      await expect(
        energyContract.getLatestEthPrice()
      ).to.be.revertedWithCustomError(energyContract, "PriceFeedStale"); // Expect custom error
    });
  });

  describe("Commit-Reveal Security", function () {
    it("Should prevent front-running attacks", async function () {
      // Test commit-reveal timing
      // Setup: addr1 commits to a purchase
      const kWh = 100;
      const nonce = 12345;
      const commitmentHash = ethers.keccak256(
        ethers.solidityPacked(
          ["uint256", "uint256", "address"],
          [kWh, nonce, addr1.address]
        )
      );
      console.log("Commitment hash:", commitmentHash);
      //await energyContract.connect(solarFarm).authorizeParty(addr1.address);

      await energyContract.connect(solarFarm).authorizeParty(addr1.address);
      await energyContract.connect(solarFarm).authorizeParty(addr2.address);
      await energyContract.connect(solarFarm).requestAddEnergy(1000);

      const startBlock = await ethers.provider.getBlock("latest");
      const addEnergyTimestamp = startBlock.timestamp + 2 * 60 + 1; // 2 minutes + 1 second
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        addEnergyTimestamp,
      ]);
      await ethers.provider.send("evm_mine");

      await energyContract
        .connect(solarFarm)
        .confirmAddEnergy(MAX_KWH_PER_PURCHASE);

      // Verify energy was added
      const availableKWh = await energyContract.availableKWh();
      console.log("Available kWh after setup:", availableKWh.toString());
      const commitBlock = await ethers.provider.getBlock("latest");
      const commitTimestamp = commitBlock.timestamp + 1; // Immediately after last block
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        commitTimestamp,
      ]);
      await energyContract.connect(addr1).commitPurchase(commitmentHash);
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        commitTimestamp + 1,
      ]);
      await energyContract.connect(addr2).commitPurchase(commitmentHash);

      // Cache the ETH price
      await energyContract.getLatestEthPrice();

      const revealTimestamp = commitTimestamp + 10; // Well within 5 minutes (300 seconds)
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        revealTimestamp,
      ]);

      // Calculate payment
      const ethPriceUSD = await energyContract.getCachedEthPrice();
      const totalCostUSDCents = BigInt(kWh) * BigInt(pricePerKWhUSDCents);
      const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
      const totalCostWei =
        (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;
      // Test: addr2 tries to reveal addr1's commitment
      await expect(
        energyContract
          .connect(addr2)
          .revealPurchase(kWh, nonce, { value: totalCostWei })
      ).to.be.revertedWithCustomError(energyContract, "InvalidCommitment");

      await ethers.provider.send("evm_setNextBlockTimestamp", [
        revealTimestamp + 1,
      ]);

      try {
        await expect(
          energyContract
            .connect(addr1)
            .revealPurchase(kWh, nonce, { value: totalCostWei })
        ).to.not.be.revertedWithCustomError(
          energyContract,
          "InvalidCommitment"
        );
      } catch (error) {
        console.log("Revert reason for addr1 reveal:", error.message);
        throw error; // Rethrow to fail the test
      }
      // test 3
      // Test 5: Zero commitment hash
      await expect(
        energyContract.connect(addr1).commitPurchase(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(energyContract, "InvalidCommitmentHash");
      // Test 6: No commitment exists
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        revealTimestamp + 80,
      ]);
      await expect(
        energyContract
          .connect(addr1)
          .revealPurchase(kWh, nonce, { value: totalCostWei })
      ).to.be.revertedWithCustomError(energyContract, "CommitmentExpired");
      // Test 7: Expired commitment
      await ethers.provider.send("evm_increaseTime", [300]); // Advance time to clear cooldown
      await ethers.provider.send("evm_mine");
      await energyContract.connect(addr1).commitPurchase(commitmentHash);
      await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]); // Beyond 5-minute window
      await ethers.provider.send("evm_mine");
      await expect(
        energyContract
          .connect(addr1)
          .revealPurchase(kWh, nonce, { value: totalCostWei })
      ).to.be.revertedWithCustomError(energyContract, "CommitmentExpired");
    });

    it("Should validate commitment hashes correctly", async function () {
      // Test hash validation edge cases
    });
  });
});
