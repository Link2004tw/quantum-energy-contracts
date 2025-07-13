const { expect } = require("chai");
const { ethers } = require("hardhat");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");

describe("EnergyContract Unit Tests", function () {
  let EnergyContract, energyContract, MockV3Aggregator, mockPriceFeed;
  let owner, addr1, addr2, solarFarm;
  const MAX_KWH_PER_PURCHASE = 1000;
  const PRICE_PER_KWH_USD_CENTS = 12;

  // Helper function to add energy
  const addEnergy = async () => {
    await energyContract.connect(solarFarm).requestAddEnergy(1000);
    const requestBlock = await ethers.provider.getBlock("latest");
    const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
    await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
    await ethers.provider.send("evm_mine");
    await energyContract.connect(solarFarm).confirmAddEnergy(1000);
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

  // Refactored helper functions
  const commitPurchase = async (sender, commitmentHash) => {
    const commitBlock = await ethers.provider.getBlock("latest");
    const commitTimestamp = commitBlock.timestamp + 1;
    await ethers.provider.send("evm_setNextBlockTimestamp", [commitTimestamp]);
    await energyContract.connect(sender).commitPurchase(commitmentHash);
    return commitTimestamp;
  };

  const revealPurchase = async (sender, kWh, nonce, expectSuccess = true) => {
    const ethPriceUSD = await energyContract.getCachedEthPrice();
    console.log("ETH Price USD:", ethPriceUSD.toString());
    const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
    const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
    const totalCostWei =
      (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents * BigInt(10 ** 10);
    const revealTimestamp =
      (await ethers.provider.getBlock("latest")).timestamp + 10;
    await ethers.provider.send("evm_setNextBlockTimestamp", [revealTimestamp]);
    console.log("total cost in wei:", totalCostWei.toString());
    const tx = energyContract
      .connect(sender)
      .revealPurchase(kWh, nonce ,{ value: totalCostWei  });

    if (expectSuccess) {
      await expect(tx)
        .to.emit(energyContract, "EnergyPurchased")
        .withArgs(
          sender.address,
          solarFarm.address,
          kWh,
          totalCostWei,
          ethPriceUSD,
          revealTimestamp
        );
      //expect(await energyContract.availableKWh()).to.equal(1000 - kWh);
    } else {
      await expect(tx).to.be.revertedWithCustomError(
        energyContract,
        "InvalidCommitment"
      );
    }
  };

  
  const advanceTime = async (seconds) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  };

  const calculatePayment = async (kWh, ethPriceUSD) => {
    const expectedCostWei =
      (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
      (BigInt(ethPriceUSD * 10 ** 8) / BigInt(10 ** 2));
    const payment = await energyContract.calculateRequiredPayment(
      kWh,
      BigInt(ethPriceUSD * 10 ** 8)
    );
    expect(payment).to.equal(expectedCostWei);
  };

  const setupEnergyAndPrice = async (kWhAmount = 1000) => {
    await addEnergy();
    await energyContract.getLatestEthPrice();
  };

  beforeEach(async function () {
    [owner, addr1, addr2, solarFarm] = await ethers.getSigners();
    
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
  });

  describe("Authorization Management", function () {
    it("Should authorize new party correctly", async function () {
      const blockBefore = await ethers.provider.getBlock("latest");
      const expectedTimestamp = BigInt(blockBefore.timestamp + 1);
      
      const tx = await authorizeParty(addr1.address);
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
      // Edge case: non-owner trying to authorize
      await expect(energyContract.connect(addr1).authorizeParty(addr2))
        .to.be.revertedWithCustomError(
          energyContract,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(addr1.address);
      // Edge case: cannot authorize zero address
      await expect(
        authorizeParty(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(energyContract, "InvalidPartyAddress");
    });

    it("Should prevent duplicate authorizations", async function () {
      await authorizeParty(addr1.address);
      await expect(
        authorizeParty(addr1.address)
      ).to.be.revertedWithCustomError(energyContract, "PartyAlreadyAuthorized");
    });

    it("Should handle array removal correctly", async function () {

      await authorizeParty(addr1.address);
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

  describe("Price Calculations", function () {
    it("Should calculate payment correctly with various ETH prices", async function () {
      const kWh = 100;
      console.log("Testing with ETH price = $2000");
      await mockPriceFeed.updateAnswer(BigInt(2000 * 10 ** 8));
      await calculatePayment(kWh, 2000);
      console.log("Testing with ETH price = $1500");
      await mockPriceFeed.updateAnswer(BigInt(1500 * 10 ** 8));
      await calculatePayment(kWh, 1500);
      console.log("Testing with ETH price = $1000");
      await mockPriceFeed.updateAnswer(BigInt(1000 * 10 ** 8));
      await calculatePayment(kWh, 1000);
    });

    it("Should handle price feed failures gracefully", async function () {
      await mockPriceFeed.updateAnswer(BigInt(2000 * 10 ** 8));
      await energyContract.getLatestEthPrice();
      const cachedPrice = await energyContract.getCachedEthPrice();
      expect(cachedPrice).to.equal(BigInt(2000 * 10 ** 18));
      console.log(cachedPrice.toString());

      // Test 1: Invalid price (price <= 0)
      await mockPriceFeed.updateAnswer(0);
      await expect(energyContract.getLatestEthPrice()).to.not.be.reverted;
      expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice);

      // Test 2: Stale price
      const stalenessThreshold = 15 * 60;
      const currentTimestamp = (await ethers.provider.getBlock("latest"))
        .timestamp;
      await mockPriceFeed.updateRoundData(
        2,
        BigInt(2500 * 10 ** 8),
        currentTimestamp - stalenessThreshold - 1,
        2
      );
      await expect(energyContract.getLatestEthPrice()).to.not.be.reverted;
      expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice);

      // Test 3: Stale cache
      await advanceTime(stalenessThreshold + 1);
      await advanceTime(stalenessThreshold + 1);
      await expect(
        energyContract.getLatestEthPrice()
      ).to.be.revertedWithCustomError(energyContract, "PriceFeedStale");
    });
  });

  describe("Commit-Reveal Security", function () {
    it("Should prevent front-running attacks", async function () {
      const kWh = 100;
      const nonce = 12345;
      await authorizeParty(addr1.address);
      await authorizeParty(addr2.address);
      await setupEnergyAndPrice();

      const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
      const commitTimestamp = 
      await commitPurchase(addr1, commitmentHash);
      await commitPurchase(addr2, commitmentHash); // addr2 tries same commitment

      await revealPurchase(addr2, kWh, nonce,false); // Should fail
      
      });

    it("Should validate commitment hashes correctly", async function () {
      const kWh = 100;
      const nonce = 12345;
      const invalidKWh = 200;
      await authorizeParty(addr1.address);
      await setupEnergyAndPrice();
      const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
      await commitPurchase(addr1, commitmentHash);
      await revealPurchase(addr1, kWh, nonce,true);

      // Test 2: Invalid commitment hash (wrong kWh)
      await setupEnergyAndPrice();
      await advanceTime(300);
      await commitPurchase(addr1, commitmentHash);
      await expect(
        energyContract
          .connect(addr1)
          .revealPurchase(invalidKWh, nonce, { value: 0 })
      ).to.be.revertedWithCustomError(energyContract, "InvalidCommitment");
    });
  });
});


// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("EnergyContract Unit Tests", function () {
//   let EnergyContract, energyContract, MockV3Aggregator, mockPriceFeed;
//   let owner, addr1, addr2, solarFarm;
//   const MAX_KWH_PER_PURCHASE = 1000;
//   const PRICE_PER_KWH_USD_CENTS = 12;
//   const COMMIT_REVEAL_WINDOW = 5 * 60; // 5 minutes in seconds

//   // Helper function to add energy
//   const addEnergy = async (kWhAmount = 1000) => {
//     await energyContract.connect(solarFarm).requestAddEnergy(kWhAmount);
//     const requestBlock = await ethers.provider.getBlock("latest");
//     const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second
//     await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);
//     await ethers.provider.send("evm_mine");
//     await energyContract.connect(solarFarm).confirmAddEnergy(kWhAmount);
//   };

//   const authorizeParty = async (partyAddress) => {
//     return await energyContract.connect(solarFarm).authorizeParty(partyAddress);
//   };

//   const getHashedCommitment = (kWh, nonce, sender) => {
//     return ethers.keccak256(
//       ethers.solidityPacked(["uint256", "uint256", "address"], [kWh, nonce, sender])
//     );
//   };

//   // Refactored helper functions
//   const commitPurchase = async (sender, commitmentHash) => {
//     const commitBlock = await ethers.provider.getBlock("latest");
//     const commitTimestamp = commitBlock.timestamp + 1;
//     await ethers.provider.send("evm_setNextBlockTimestamp", [commitTimestamp]);
//     await energyContract.connect(sender).commitPurchase(commitmentHash);
//     return commitTimestamp;
//   };

//   const revealPurchase = async (sender, kWh, nonce, maxEthPriceUSD, expectSuccess = true) => {
//     const ethPriceUSD = await energyContract.getCachedEthPrice();
//     const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
//     const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
//     const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;
//     const revealTimestamp = (await ethers.provider.getBlock("latest")).timestamp + 10;
//     await ethers.provider.send("evm_setNextBlockTimestamp", [revealTimestamp]);

//     const tx = energyContract
//       .connect(sender)
//       .revealPurchase(kWh, nonce, maxEthPriceUSD, { value: totalCostWei });

//     if (expectSuccess) {
//       await expect(tx)
//         .to.emit(energyContract, "EnergyPurchased")
//         .withArgs(sender.address, solarFarm.address, kWh, totalCostWei, ethPriceUSD, revealTimestamp);
//       expect(await energyContract.availableKWh()).to.equal(1000 - kWh);
//     } else {
//       await expect(tx).to.be.revertedWithCustomError(energyContract, "InvalidCommitment");
//     }
//   };

//   const advanceTime = async (seconds) => {
//     await ethers.provider.send("evm_increaseTime", [seconds]);
//     await ethers.provider.send("evm_mine");
//   };

//   const calculatePayment = async (kWh, ethPriceUSD) => {
//     const expectedCostWei =
//       (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
//       (BigInt(ethPriceUSD * 10 ** 8) / BigInt(10 ** 2));
//     const payment = await energyContract.calculateRequiredPayment(kWh, BigInt(ethPriceUSD * 10 ** 8));
//     expect(payment).to.equal(expectedCostWei);
//   };

//   const setupEnergyAndPrice = async (kWhAmount = 1000) => {
//     await addEnergy(kWhAmount);
//     await energyContract.getLatestEthPrice();
//   };

//   beforeEach(async function () {
//     [owner, addr1, addr2, solarFarm] = await ethers.getSigners();

//     // Deploy MockV3Aggregator
//     MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
//     mockPriceFeed = await MockV3Aggregator.deploy(8, BigInt(2000 * 10 ** 8)); // 8 decimals, $2000 ETH/USD
//     await mockPriceFeed.waitForDeployment();

//     // Deploy EnergyContract
//     EnergyContract = await ethers.getContractFactory("EnergyContract");
//     energyContract = await EnergyContract.deploy(await mockPriceFeed.getAddress(), solarFarm.address);
//   });

//   describe("Authorization Management", function () {
//     it("Should authorize new party correctly", async function () {
//       const blockBefore = await ethers.provider.getBlock("latest");
//       const expectedTimestamp = BigInt(blockBefore.timestamp + 1);

//       const tx = await authorizeParty(addr1.address);
//       const receipt = await tx.wait();
//       const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
//       console.log("Block timestamp after authorization:", blockAfter.timestamp);
//       await expect(tx)
//         .to.emit(energyContract, "Authorized")
//         .withArgs(addr1.address, expectedTimestamp);
//       expect(await energyContract.authorizedParties(addr1.address)).to.equal(true);
//       const authorized = await energyContract.getAuthorizedPartyList();
//       expect(authorized).to.include(addr1.address);
//       expect(authorized).to.include(solarFarm.address);
//       expect(authorized.length).to.equal(2);

//       // Edge case: non-owner trying to authorize
//       await expect(energyContract.connect(addr1).authorizeParty(addr2))
//         .to.be.revertedWithCustomError(energyContract, "OwnableUnauthorizedAccount")
//         .withArgs(addr1.address);

//       // Edge case: cannot authorize zero address
//       await expect(authorizeParty(ethers.ZeroAddress)).to.be.revertedWithCustomError(
//         energyContract,
//         "InvalidPartyAddress"
//       );

//       // Edge case: cannot authorize contract address
//       const MaliciousContract = await ethers.getContractFactory("TestEnergyContract");
//       const malicious = await MaliciousContract.deploy(energyContract.getAddress());
//       await expect(authorizeParty(malicious.getAddress())).to.be.revertedWithCustomError(
//         energyContract,
//         "InvalidPartyAddress"
//       );
//     });

//     it("Should prevent duplicate authorizations", async function () {
//       await authorizeParty(addr1.address);
//       await expect(authorizeParty(addr1.address)).to.be.revertedWithCustomError(
//         energyContract,
//         "PartyAlreadyAuthorized"
//       );
//     });

//     it("Should handle array removal correctly", async function () {
//       await authorizeParty(addr1.address);
//       expect(await energyContract.authorizedParties(addr1.address)).to.equal(true);
//       await energyContract.connect(solarFarm).unAuthorizeParty(addr1.address);
//       expect(await energyContract.authorizedParties(addr1.address)).to.equal(false);
//       const authorized = await energyContract.getAuthorizedPartyList();
//       expect(authorized).to.not.include(addr1.address);
//       expect(authorized.length).to.equal(1); // Only solarFarm should remain
//     });
//   });

//   describe("Price Calculations", function () {
//     it("Should calculate payment correctly with various ETH prices", async function () {
//       const kWh = 100;
//       console.log("Testing with ETH price = $2000");
//       await mockPriceFeed.updateAnswer(BigInt(2000 * 10 ** 8));
//       await calculatePayment(kWh, 2000);
//       console.log("Testing with ETH price = $1500");
//       await mockPriceFeed.updateAnswer(BigInt(1500 * 10 ** 8));
//       await calculatePayment(kWh, 1500);
//       console.log("Testing with ETH price = $1000");
//       await mockPriceFeed.updateAnswer(BigInt(1000 * 10 ** 8));
//       await calculatePayment(kWh, 1000);
//     });

//     it("Should handle price feed failures gracefully", async function () {
//       await mockPriceFeed.updateAnswer(BigInt(2000 * 10 ** 8));
//       await energyContract.getLatestEthPrice();
//       const cachedPrice = await energyContract.getCachedEthPrice();
//       expect(cachedPrice).to.equal(BigInt(2000 * 10 ** 18));
//       console.log(cachedPrice.toString());

//       // Test 1: Invalid price (price <= 0)
//       await mockPriceFeed.updateAnswer(0);
//       await expect(energyContract.getLatestEthPrice()).to.not.be.reverted;
//       expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice);

//       // Test 2: Stale price
//       const stalenessThreshold = 5 * 60; // Updated to match contract's 5 minutes
//       const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
//       await mockPriceFeed.updateRoundData(
//         2,
//         BigInt(2500 * 10 ** 8),
//         currentTimestamp - stalenessThreshold - 1,
//         2
//       );
//       await expect(energyContract.getLatestEthPrice()).to.not.be.reverted;
//       expect(await energyContract.getCachedEthPrice()).to.equal(cachedPrice);

//       // Test 3: Stale cache
//       await advanceTime(stalenessThreshold + 1);
//       await expect(energyContract.getLatestEthPrice()).to.be.revertedWithCustomError(
//         energyContract,
//         "PriceFeedStale"
//       );
//     });

//     it("Should enforce slippage protection in revealPurchase", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       await authorizeParty(addr1.address);
//       await setupEnergyAndPrice();

//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);

//       // Test: Price exceeds maxEthPriceUSD
//       const ethPriceUSD = await energyContract.getCachedEthPrice();
//       const invalidMaxEthPriceUSD = ethPriceUSD - BigInt(100 * 10 ** 8); // Set lower than current price
//       const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
//       const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
//       const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;

//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(kWh, nonce, invalidMaxEthPriceUSD, { value: totalCostWei })
//       ).to.be.revertedWithCustomError(energyContract, "PriceExceedsMax");

//       // Test: Valid maxEthPriceUSD
//       await revealPurchase(addr1, kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), true);
//     });
//   });

//   describe("Commit-Reveal Security", function () {
//     it("Should prevent front-running attacks", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       await authorizeParty(addr1.address);
//       await authorizeParty(addr2.address);
//       await setupEnergyAndPrice();

//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);
//       await commitPurchase(addr2, commitmentHash); // addr2 tries same commitment

//       const ethPriceUSD = await energyContract.getCachedEthPrice();
//       await revealPurchase(addr2, kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), false); // Should fail
//       await revealPurchase(addr1, kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), true); // Should succeed

//       // Test: Zero commitment hash
//       await expect(
//         energyContract.connect(addr1).commitPurchase(ethers.ZeroHash)
//       ).to.be.revertedWithCustomError(energyContract, "InvalidCommitmentHash");

//       // Test: No commitment exists
//       await advanceTime(80);
//       const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
//       const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
//       const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;
//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), { value: totalCostWei })
//       ).to.be.revertedWithCustomError(energyContract, "CommitmentExpired");

//       // Test: Expired commitment
//       await setupEnergyAndPrice();
//       await commitPurchase(addr1, commitmentHash);
//       await advanceTime(COMMIT_REVEAL_WINDOW + 1);
//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), { value: totalCostWei })
//       ).to.be.revertedWithCustomError(energyContract, "CommitmentExpired");
//     });

//     it("Should validate commitment hashes correctly", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       const invalidKWh = 200;
//       await authorizeParty(addr1.address);
//       await setupEnergyAndPrice();
//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);

//       const ethPriceUSD = await energyContract.getCachedEthPrice();
//       await revealPurchase(addr1, kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), true);

//       // Test: Invalid commitment hash (wrong kWh)
//       await setupEnergyAndPrice();
//       await commitPurchase(addr1, commitmentHash);
//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(invalidKWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), {
//             value: (BigInt(invalidKWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
//                    (ethPriceUSD / BigInt(10 ** 2))
//           })
//       ).to.be.revertedWithCustomError(energyContract, "InvalidCommitment");

//       // Test: Invalid nonce
//       await setupEnergyAndPrice();
//       await commitPurchase(addr1, commitmentHash);
//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(kWh, nonce + 1, ethPriceUSD + BigInt(100 * 10 ** 8), {
//             value: (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
//                    (ethPriceUSD / BigInt(10 ** 2))
//           })
//       ).to.be.revertedWithCustomError(energyContract, "InvalidCommitment");

//       // Test: Invalid nonce (zero)
//       await setupEnergyAndPrice();
//       await commitPurchase(addr1, commitmentHash);
//       await expect(
//         energyContract
//           .connect(addr1)
//           .revealPurchase(kWh, 0, ethPriceUSD + BigInt(100 * 10 ** 8), {
//             value: (BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS) * BigInt(10 ** 18)) /
//                    (ethPriceUSD / BigInt(10 ** 2))
//           })
//       ).to.be.revertedWithCustomError(energyContract, "InvalidNonce");
//     });

//     it("Should enforce commitment cooldown", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       await authorizeParty(addr1.address);
//       await setupEnergyAndPrice();
//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);

//       // Try committing again before cooldown (5 minutes)
//       await advanceTime(60); // 1 minute
//       await expect(
//         energyContract.connect(addr1).commitPurchase(commitmentHash)
//       ).to.be.revertedWithCustomError(energyContract, "CommitmentCooldownActive");

//       // Try after cooldown
//       await advanceTime(5 * 60); // 5 minutes
//       await commitPurchase(addr1, commitmentHash);
//     });
//   });

//   describe("Pull-Based Payments", function () {
//     it("Should accumulate and withdraw payments correctly", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       await authorizeParty(addr1.address);
//       await setupEnergyAndPrice();
//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);

//       const ethPriceUSD = await energyContract.getCachedEthPrice();
//       const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
//       const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
//       const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;

//       await energyContract
//         .connect(addr1)
//         .revealPurchase(kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), { value: totalCostWei });

//       expect(await energyContract.paymentBalances(solarFarm.address)).to.equal(totalCostWei);

//       const balanceBefore = await ethers.provider.getBalance(solarFarm.address);
//       const tx = await energyContract.connect(solarFarm).withdrawPayments();
//       const receipt = await tx.wait();
//       const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
//       const balanceAfter = await ethers.provider.getBalance(solarFarm.address);
//       expect(balanceAfter - balanceBefore).to.equal(totalCostWei - gasUsed);

//       await expect(tx)
//         .to.emit(energyContract, "PaymentWithdrawn")
//         .withArgs(solarFarm.address, totalCostWei, (await ethers.provider.getBlock(receipt.blockNumber)).timestamp);
//       expect(await energyContract.paymentBalances(solarFarm.address)).to.equal(0);
//     });

//     it("Should handle refunds correctly", async function () {
//       const kWh = 100;
//       const nonce = 12345;
//       await authorizeParty(addr1.address);
//       await setupEnergyAndPrice();
//       const commitmentHash = getHashedCommitment(kWh, nonce, addr1.address);
//       await commitPurchase(addr1, commitmentHash);

//       const ethPriceUSD = await energyContract.getCachedEthPrice();
//       const totalCostUSDCents = BigInt(kWh) * BigInt(PRICE_PER_KWH_USD_CENTS);
//       const ethPriceUSDInCents = ethPriceUSD / BigInt(10 ** 2);
//       const totalCostWei = (totalCostUSDCents * BigInt(10 ** 18)) / ethPriceUSDInCents;
//       const overpayment = totalCostWei + ethers.parseEther("0.1");

//       await energyContract
//         .connect(addr1)
//         .revealPurchase(kWh, nonce, ethPriceUSD + BigInt(100 * 10 ** 8), { value: overpayment });

//       expect(await energyContract.pendingRefunds(addr1.address)).to.equal(ethers.parseEther("0.1"));

//       const balanceBefore = await ethers.provider.getBalance(addr1.address);
//       const tx = await energyContract.connect(addr1).withdrawRefunds();
//       const receipt = await tx.wait();
//       const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
//       const balanceAfter = await ethers.provider.getBalance(addr1.address);
//       expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.1") - gasUsed);

//       await expect(tx)
//         .to.emit(energyContract, "RefundWithdrawn")
//         .withArgs(addr1.address, ethers.parseEther("0.1"), (await ethers.provider.getBlock(receipt.blockNumber)).timestamp);
//       expect(await energyContract.pendingRefunds(addr1.address)).to.equal(0);
//     });
//   });
// });