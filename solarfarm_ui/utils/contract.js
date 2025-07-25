import { ethers } from "ethers";
import CONTRACT_ABI from "../config/SolarFarmABI.json";
import MOCKPRICE_ABI from "../config/MockPriceABI.json";
import { Transaction } from "@/models/transaction";
// Contract ABI and address (replace with your deployed address)
const CONTRACT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"; // Update with your deployed EnergyContract address

const MOCKP_RICE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

//0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
// Network configuration
const NETWORK_CONFIG = {
  hardhat: {
    chainId: "31337",
    rpcUrl: "http://127.0.0.1:8545",
    chainName: "Hardhat",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: [],
  },
  sepolia: {
    chainId: "11155111",
    rpcUrl:
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_ACCESS_KEY",
    chainName: "Sepolia",
    currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

// Initialize contract
const getContract = async (
  networkName = "hardhat",
  address,
  abi,
  useSigner = false
) => {
  try {
    let provider;
    let signer;

    if (useSigner && typeof window.ethereum !== "undefined") {
      // MetaMask provider
      provider = new ethers.BrowserProvider(window.ethereum);

      await window.ethereum.request({ method: "eth_requestAccounts" });
      signer = await provider.getSigner();

      // Switch to the correct network
      const network = await provider.getNetwork();
      const targetConfig = NETWORK_CONFIG[networkName];
      //console.log("Current network:", NETWORK_CONFIG);
      if (network.chainId.toString() !== targetConfig.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [
              {
                chainId: `0x${parseInt(targetConfig.chainId, 10).toString(16)}`,
              },
            ],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${parseInt(targetConfig.chainId, 10).toString(
                    16
                  )}`,
                  chainName: targetConfig.chainName,
                  rpcUrls: [targetConfig.rpcUrl],
                  nativeCurrency: targetConfig.currency,
                  blockExplorerUrls: targetConfig.blockExplorerUrls,
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
      return new ethers.Contract(address, abi, signer);
    } else {
      // RPC provider for read-only
      const targetConfig = NETWORK_CONFIG[networkName];
      provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
      return new ethers.Contract(address, abi, provider);
    }
  } catch (error) {
    throw new Error(`Failed to initialize contract: ${error.message}`);
  }
};

// Check if contract connection is successful
export const checkContractConnection = async (networkName = "hardhat") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false
    );
    const provider = contract.runner.provider;

    // Check provider connection
    const network = await provider.getNetwork();
    const targetConfig = NETWORK_CONFIG[networkName];
    if (network.chainId.toString() !== targetConfig.chainId) {
      throw new Error(
        `Wrong network: expected chainId ${targetConfig.chainId}, got ${network.chainId}`
      );
    }

    // Check if contract is deployed (has code at address)
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      throw new Error(`No contract deployed at address ${CONTRACT_ADDRESS}`);
    }

    // Test a simple read call to solarFarm()
    const solarFarmAddress = await contract.solarFarm();
    if (!ethers.isAddress(solarFarmAddress)) {
      throw new Error(
        `Invalid solarFarm address returned: ${solarFarmAddress}`
      );
    }

    return {
      isConnected: true,
      message: `Successfully connected to EnergyContract at ${CONTRACT_ADDRESS} on ${targetConfig.chainName}`,
      chainId: network.chainId.toString(),
      solarFarmAddress,
    };
  } catch (error) {
    return {
      isConnected: false,
      message: `Connection failed: ${error.message}`,
      chainId: null,
      solarFarmAddress: null,
    };
  }
};

// Call solarFarm()
export const getSolarFarm = async (networkName = "hardhat") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false
    );
    const solarFarmAddress = await contract.solarFarm();
    return solarFarmAddress;
  } catch (error) {
    throw new Error(`Error calling solarFarm: ${error.message}`);
  }
};

// Call getLatestEthPrice()
export const getLatestEthPrice = async (networkName = "hardhat") => {
  try {
    // Use signer to call getLatestEthPrice as it updates the cache
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    //const tx =
    await contract.getLatestEthPrice();
    //await tx.wait(); // Wait for transaction to mine and update cache
    console.log("the error is not before here");
    const price = await contract.getCachedEthPrice();
    return price.toString(); // Return as string to avoid BigInt issues
  } catch (error) {
    console.error("Error calling getLatestEthPrice:", error);
    if (error.data) {
      try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const decodedError = iface.parseError(error.data);
        console.log(decodedError.args);
        // throw new Error(
        //   `Contract error: ${decodedError.name} ${JSON.stringify(decodedError.args)}`
        // );
      } catch (decodeError) {
        console.error("Could not decode revert reason:", decodeError);
      }
    }
    throw new Error(`Error calling getLatestEthPrice: ${error.message}`);
  }
};

export const getCost = async (amount, networkName = "hardhat") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false
    );
    //console.log("Calculating cost for amount:", amount);
    if (amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }
    const ethPrice = BigInt(parseInt(await getLatestEthPrice(networkName)));
    console.log(ethPrice);
    console.log("Latest ETH price:", ethPrice / BigInt(1e10));
    const price = await contract.calculateRequiredPayment(
      amount,
      ethPrice / BigInt(1e10)
    );
    console.log("Price in wei:", price.toString());
    return ethers.formatUnits(price, 18); // Convert to ETH
  } catch (error) {
    throw new Error(`Error calculating cost: ${error.message}`);
  }
};

export const getAvailableEnergy = async (networkName = "hardhat") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false
    );
    console.log("Fetching available energy...");
    const energy = await contract.availableKWh();
    return energy;
  } catch (error) {
    throw new Error(`Error fetching available energy: ${error.message}`);
  }
};

const getHashedCommitment = (kWh, nonce, sender) => {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "uint256", "address"],
      [kWh, nonce, sender]
    )
  );
};

// Derive a numeric nonce from Firebase UID
export const getNonceFromUid = (uid) => {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new Error("Invalid Firebase UID");
  }

  // Hash the UID to a bytes32 value
  const hash = ethers.keccak256(ethers.toUtf8Bytes(uid));

  // Convert first 4 bytes of hash to a number
  const hashNumber = Number(BigInt(hash.slice(0, 10)) & BigInt(0xffffffff));

  // Scale to 5-digit range (10000 to 99999)
  const nonce = 10000 + (hashNumber % 90000);

  console.log("Derived nonce from UID:", nonce);
  return nonce.toString(); // Return as string
};

// grok fixed this function
export const commitPurchase = async (networkName = "hardhat", amount, user) => {
  try {
    if (amount > 1000) {
      throw new Error("Amount cannot be bigger than 1000 kWh");
    }
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    ); // Use signer for transactions
    //console.log("uid is ", user._uid, typeof user._uid);
    const nonce = getNonceFromUid(user._uid); // Use _uid for nonce

    const hash = getHashedCommitment(amount, nonce, user._ethereumAddress); // Use uid instead of _id
    console.log(hash);
    const tx = await contract.commitPurchase(hash);
    await tx.wait(); // Wait for transaction confirmation
    //console.log(`Purchase committed: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    throw new Error(`Error committing purchase: ${error.message}`);
  }
};

export const getEthBalance = async (address, networkName = "hardhat") => {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }
    const targetConfig = NETWORK_CONFIG[networkName];
    const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    console.log(`ETH Balance for ${address}: ${balanceEth} ETH`);
    return balanceEth;
  } catch (error) {
    console.error(`Error fetching ETH balance for ${address}:`, error.message);
    throw new Error(`Failed to fetch ETH balance: ${error.message}`);
  }
};

export const revealPurchase = async (networkName = "hardhat", amount, user) => {
  try {
    if (!amount || amount <= 0 || amount > 1000) {
      throw new Error("Amount must be between 1 and 1000 kWh");
    }
    if (!user || !user._ethereumAddress) {
      throw new Error("User Ethereum address is required");
    }
    console.log("error is not before here");
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    ); // Use signer
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();

    if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
      throw new Error(
        "Signer address does not match provided Ethereum address"
      );
    }

    // Calculate required payment
    await contract.getLatestEthPrice(); // Ensure the contract is ready
    const ethPrice = await contract.getCachedEthPrice();
    console.log("eth price in reveal purchase: ", ethPrice / BigInt(10e10));

    const totalCostWei = await contract.calculateRequiredPayment(
      amount,
      ethPrice / BigInt(10e10)
    );

    // Call revealPurchase
    const revealTx = await contract.revealPurchase(
      amount,
      getNonceFromUid(user._uid),
      {
        value: totalCostWei,
      }
    );
    const receipt = await revealTx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Error in revealPurchase:", error);
    throw new Error(
      error.reason || error.message || "Failed to reveal purchase"
    );
  }
};

// utils/contract.js
export const getTransactions = async (networkName = "hardhat") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false // Read-only, no signer needed
    );

    // Get the total number of transactions
    const transactionCount = await contract.transactionCount();
    const transactionCountNum = Number(transactionCount); // Convert BigNumber to number

    // Array to store transactions
    const transactions = [];

    // Loop through each transaction index
    for (let i = 0; i < transactionCountNum; i++) {
      try {
        const tx = await contract.transactions(i);
        transactions.push(
          new Transaction({
            index: i,
            buyer: tx.buyer,
            seller: tx.seller,
            kWh: tx.kWh.toString(),
            pricePerKWhUSD: tx.pricePerKWhUSD.toString(),
            ethPriceUSD: tx.ethPriceUSD.toString(),
            timestamp: Number(tx.timestamp),
          })
        );
      } catch (error) {
        console.error(`Error fetching transaction at index ${i}:`, error);
        transactions.push(
          new Transaction({
            index: i,
            error: `Failed to fetch transaction ${i}`,
          })
        );
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }
};

export const checkIfAuthorized = async (user) => {
  console.log("Checking if user is authorized:", user);
  if (!user || !user._ethereumAddress) {
    throw new Error(
      "User is not authenticated or does not have an Ethereum address."
    );
  }
  const contract = await getContract(
    "hardhat",
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    true
  );
  return await contract.authorizedParties(user._ethereumAddress);
};

// this is for testing purposes only. for admin use

export const getMockPrice = async () => {
  const mockPriceContract = await getContract(
    "hardhat",
    MOCKP_RICE_ADDRESS,
    MOCKPRICE_ABI,
    false
  );

  return await mockPriceContract.latestRoundData();
};

export const updateAnswer = async (price, networkName = "hardhat") => {
  const mockPriceContract = await getContract(
    networkName,
    MOCKP_RICE_ADDRESS,
    MOCKPRICE_ABI,
    true
  );
  const solarFarmContract = await getContract(
    networkName,
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    false
  );
  //const ethprice = await solarFarmContract.getCachedEthPrice();
  await mockPriceContract.updateAnswer(price);
};

export const addEnergy = async (kwh, networkName = "hardhat") => {
  try {
    if (!kwh || kwh <= 0 || kwh > 1000) {
      alert("kWh must be between 1 and 1000");
      throw new Error("kWh must be between 1 and 1000");
    }

    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    console.log("fel add energy yasta");
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log(signerAddress);

    const ownerAddress = await getSolarFarm();
    console.log(ownerAddress);
    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      alert("Only the contract owner (solar farm) can add energy");
      throw new Error("Only the contract owner can add energy");
    }

    // Step 1: Request to add energy
    const requestTx = await contract.requestAddEnergy(kwh);
    await requestTx.wait();
    console.log(`Energy add request submitted: ${requestTx.hash}`);

    // Step 2: Wait for ADD_ENERGY_DELAY (2 minutes = 120,000 ms)
    const ADD_ENERGY_DELAY = 2 * 60 * 1000; // 2 minutes in milliseconds
    alert(
      `Please wait 2 minutes before confirming the energy addition. Transaction hash: ${requestTx.hash}`
    );
    await new Promise((resolve) => setTimeout(resolve, ADD_ENERGY_DELAY));

    // Step 3: Confirm adding energy
    const confirmTx = await contract.confirmAddEnergy(kwh);
    await confirmTx.wait();
    console.log(`Energy added successfully: ${confirmTx.hash}`);
    alert(
      `Energy added successfully! ${kwh} kWh added to the pool. Transaction hash: ${confirmTx.hash}`
    );

    return {
      requestTxHash: requestTx.hash,
      confirmTxHash: confirmTx.hash,
    };
  } catch (error) {
    console.error("Error adding energy:", error);
    let errorMessage = error.reason || error.message || "Failed to add energy";
    if (error.data) {
      try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const decodedError = iface.parseError(error.data);
        errorMessage = `${decodedError.name}: ${JSON.stringify(
          decodedError.args
        )}`;
      } catch (decodeError) {
        console.error("Could not decode revert reason:", decodeError);
      }
    }
    alert(`Error adding energy: ${errorMessage}`);
    throw new Error(`Error adding energy: ${errorMessage}`);
  }
};
