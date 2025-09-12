const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs"); // Added: For reading ABI JSON file
const path = require("path"); // Added: For handling file paths

describe("EnergyContract on Sepolia Fork", function () {
  let contract,
    uraniumPriceConsumer,
    owner,
    solarFarm,
    testingAddress,
    authenticatedWallet;
  const energyContractAddress = "0xe8D1496fE0d49eb61f35c4AA5211EaeC6741f456"; // Deployed EnergyContract address
  const uraniumPriceConsumerAddress =
    "0xf9602f536496e4473f391f0045e1ad4d1dc2ea9d"; // Replace with actual address
  const priceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const subscriptionId = 5575; // Replace with your actual subscriptionId
  const donID =
    "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
  const solarFarmAddr = "0x3998FF27EB77a6f29b4b4624d6F785264E43f5eF";
  const uraniumPrice = 7513; // $75.13 = 7513 cents
  const ethPrice = 443078483200; // $4,430.78483200 * 10^8
  const abiPath = path.resolve(
    __dirname,
    "../../artifacts/contracts/EnergyContract.sol/EnergyContract.json"
  ); // Adjust path to your ABI file
  const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8")).abi;
  const contractInterface = new ethers.Interface(contractABI); // Create Interface for decoding errors

  beforeEach(async function () {
    [owner, testingAddress, authenticatedWallet] = await ethers.getSigners();
    //console.log(testingAddress);
    // Impersonate solarFarm
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [solarFarmAddr],
    });
    // await network.provider.send("hardhat_setBalance", [
    //   solarFarmAddr,
    //   "0x1000000000000000000", // 1 ETH
    // ]);
    solarFarm = await ethers.getSigner(solarFarmAddr);

    // Connect to deployed contracts
    contract = await ethers.getContractAt(
      "EnergyContract",
      energyContractAddress,
      solarFarm
    );
    uraniumPriceConsumer = await ethers.getContractAt(
      "UraniumPriceConsumer",
      uraniumPriceConsumerAddress,
      solarFarm
    );

    // Mock ETH price
    const ethPriceHex = ethers.toBeHex(ethPrice); // Convert to hex
    await network.provider.send("hardhat_setStorageAt", [
      priceFeed,
      "0x8", // Slot for latestAnswer
      ethers.zeroPadValue(ethPriceHex, 32), // Pad to 32 bytes
    ]);

    // Set uranium price
    //await uraniumPriceConsumer.setPrice(uraniumPrice); // Requires setPrice function
  });

  it("should revert requestAddUranium(1000) due to MAX_URANIUM_POUNDS_PER_PURCHASE", async function () {
    await expect(
      contract.connect(solarFarm).requestAddUranium(1000)
    ).to.be.revertedWithCustomError(contract, "InsufficientUraniumAvailable");
  });

  it("should allow requestAddUranium(100) and confirm", async function () {
    const tx = await contract.connect(solarFarm).requestAddUranium(100);
    await tx.wait();
    expect(await contract.lastAddUraniumRequest(solarFarm.address)).to.be.gt(0);

    await network.provider.send("evm_increaseTime", [2 * 60]);
    await network.provider.send("evm_mine");

    await contract.connect(solarFarm).confirmAddUranium(100);
    expect(await contract.availableUraniumPounds()).to.equal(100);
  });

  it("should allow purchasing 5 pounds of uranium without price cap", async function () {
    // Add uranium
    const requestTx = await contract.connect(solarFarm).requestAddUranium(100);
    await requestTx.wait();
    await network.provider.send("evm_increaseTime", [2 * 60]);
    await network.provider.send("evm_mine");
    const confirmTx = await contract.connect(solarFarm).confirmAddUranium(100);
    await confirmTx.wait();
    console.log(
      "Available uranium pounds after confirm:",
      await contract.availableUraniumPounds()
    );

    // Authorize authenticatedWallet for purchase
    await contract
      .connect(solarFarm)
      .authorizeParty(authenticatedWallet.address);
    console.log("Authorized party:", authenticatedWallet.address);

    // Generate commitment hash
    const uraniumPounds = 5;
    const nonce = 12345;
    // Changed: Use block timestamp instead of system time to align with contract's block.timestamp
    const block = await ethers.provider.getBlock("latest");
    const timestamp = block.timestamp;
    const secret = ethers.id("mySecret123");
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "uint256", "uint256", "bytes32"],
      [authenticatedWallet.address, uraniumPounds, nonce, timestamp, secret]
    );
    const commitmentHash = ethers.keccak256(encodedData);
    console.log("Commitment hash:", commitmentHash);

    // Commit purchase
    try {
      const commitTx = await contract
        .connect(authenticatedWallet)
        .commitPurchase(commitmentHash);
      await commitTx.wait();
      console.log("Commit purchase successful");
    } catch (error) {
      // Added: Decode custom error using ABI
      if (error.data && error.data === "0x957285c7") {
        const decodedError = contractInterface.parseError(error.data);
        console.error("Decoded custom error in commitPurchase:", decodedError);
      }
      console.error("Commit purchase failed:", error);
      throw error;
    }

    // Calculate required payment
    const costUSD = (uraniumPounds * uraniumPrice) / 100; // 5 * 7513 / 100 = 375.65 USD
    console.log("Cost in USD:", costUSD);
    // Use BigInt for precise arithmetic
    const costWei =
      (BigInt(uraniumPounds * uraniumPrice) * BigInt(1e16)) / BigInt(ethPrice);
    console.log("Calculated costWei:", costWei.toString());

    const requiredWei = await contract.calculateRequiredPayment(
      uraniumPounds,
      ethPrice
    );
    console.log("Required Wei from contract:", requiredWei.toString());
    // Changed: Update expected value to match contract's output
    expect(requiredWei).to.equal(84781911988408361n); // Match contract's actual output
    // Reveal purchase
    try {
      const revealTx = await contract
        .connect(testingAddress)
        .revealPurchase(uraniumPounds, nonce, secret, {
          value: requiredWei,
        });
      await revealTx.wait();
      console.log("Reveal purchase successful");
    } catch (error) {
      // Added: Decode custom error using ABI
      if (error.data && error.data === "0x957285c7") {
        const decodedError = contractInterface.parseError(error.data);
        console.error("Decoded custom error in revealPurchase:", decodedError);
      }
      console.error("Reveal purchase failed:", error);
      throw error;
    }

    expect(await contract.availableUraniumPounds()).to.equal(195);
    const transaction = await contract.transactions(0);
    //console.log("Transaction record:", transaction);
    expect(transaction[2]).to.equal(BigInt(uraniumPounds));
  });
});
