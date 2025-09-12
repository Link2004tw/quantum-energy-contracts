import { ethers } from "ethers";
import CONTRACT_ABI from "../config/SolarFarmABI.json";
import MOCKPRICE_ABI from "../config/MockPriceABI.json";
import Transaction from "@/models/transaction";

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
  networkName = "sepolia",
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
export const checkContractConnection = async (networkName = "sepolia") => {
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
export const getSolarFarm = async (networkName = "sepolia") => {
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

export const getLatestEthPriceWC = async (networkName = "sepolia") => {
  try {
    // Use signer to call getLatestEthPrice as it updates the cache
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      false
    );
    const price = await contract.getLatestEthPriceWithoutCaching();
    return Number(price) / 1e18;
  } catch (error) {
    console.log(error);
  }
};
// Call getLatestEthPrice()
export const getLatestEthPrice = async (networkName = "sepolia") => {
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
    const price = await contract.getCachedEthPrice();
    return price.toString(); // Return as string to avoid BigInt issues
  } catch (error) {
    console.error("Error calling getLatestEthPrice:", error);
    if (error.data) {
      try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const decodedError = iface.parseError(error.data);
      } catch (decodeError) {
        console.error("Could not decode revert reason:", decodeError);
      }
    }
    throw new Error(`Error calling getLatestEthPrice: ${error.message}`);
  }
};

export const getCost = async (amount, networkName = "sepolia") => {
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
    const price = await contract.calculateRequiredPayment(
      amount,
      ethPrice / BigInt(1e10)
    );
    return ethers.formatUnits(price, 18); // Convert to ETH
  } catch (error) {
    throw new Error(`Error calculating cost: ${error.message}`);
  }
};

export const getAvailableEnergy = async (networkName = "sepolia") => {
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

  return nonce.toString(); // Return as string
};

// grok fixed this function
export const commitPurchase = async (networkName = "sepolia", amount, user) => {
  try {
    if (amount > 1000) {
      throw new Error("Amount cannot be bigger than 1000 kWh");
    }
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true // Use signer for transactions
    );

    // Generate nonce from UID
    const nonce = getNonceFromUid(user._uid);

    // Calculate hashed commitment
    const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);
    // Calculate energy cost using getCost

    //const { gasCostInEth, energyCostInEth, totalCostInEth, gasEstimate } =
    //  estimateGasForCommitPurchase("sepolia", amount, user);
    // Inform user of costs
    // console.log("1");
    // console.log(energyCostInEth);
    // const confirmation = window.confirm(
    //   `Energy Cost: ${energyCostInEth} ETH\n` +
    //     `Estimated Gas Cost: ${gasCostInEth} ETH\n` +
    //     `Total Estimated Cost: ${totalCostInEth} ETH\n` +
    //     `Proceed with transaction? (As of 12:33 AM EEST, July 29, 2025)`
    // );

    //if (!confirmation) throw new Error("Transaction cancelled by user");

    // Execute transaction with estimated gas
    const tx = await contract.commitPurchase(hash);
    await tx.wait(); // Wait for transaction confirmation
    return hash;
  } catch (error) {
    throw new Error(`Error committing purchase: ${error.message}`);
  }
};

export const estimateGasForCommitPurchase = async (
  networkName = "sepolia",
  amount,
  user
) => {
  try {
    if (amount > 1000) {
      throw new Error("Amount cannot be bigger than 1000 kWh");
    }
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true // Use signer for estimation
    );
    // Generate nonce from UID
    const nonce = getNonceFromUid(user._uid);

    // Calculate hashed commitment
    const hash = getHashedCommitment(amount, nonce, user._ethereumAddress);

    // Estimate gas for the transaction using the new syntax
    let gasEstimate;
    try {
      gasEstimate = await contract.commitPurchase.estimateGas(hash);
      console.log("Reveal Gas estimate:", gasEstimate.toString());
    } catch (estimateError) {
      console.error("estimateGas error details:", estimateError);
      throw new Error(
        `Failed to estimate gas for commitPurchase: ${estimateError.message}. Check ABI and MetaMask connection.`
      );
    }

    // Get gas price with fallback
    const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice;
    console.log(
      "Initial gas price from feeData:",
      gasPrice?.toString() || "undefined"
    );

    // Validate and calculate gas cost

    const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
    console.log("Gas cost in wei:", gasCostInWei.toString());
    const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);

    // Calculate energy cost using getCost
    const energyCostInEth = await getCost(amount, networkName);

    // Total cost in ETH (calculate in wei first)
    const energyCostInWei = ethers.parseEther(energyCostInEth);
    const totalCostInWei =
      BigInt(Number(energyCostInWei)) + BigInt(Number(gasCostInWei));
    const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(
      6
    );

    console.log("Total cost in ETH:", totalCostInEth);

    return {
      gasCostInEth,
      energyCostInEth,
      totalCostInEth,
      gasEstimate: gasEstimate.toString(),
    };
  } catch (error) {
    throw new Error(
      `Error estimating gas for commit purchase: ${error.message}`
    );
  }
};

export const estimateGasForRevealPurchase = async (
  networkName = "sepolia",
  amount,
  user
) => {
  // try {
  if (!amount || amount <= 0 || amount > 1000) {
    throw new Error("Amount must be between 1 and 1000 kWh");
  }
  if (!user || !user._ethereumAddress) {
    throw new Error("User Ethereum address is required");
  }
  const contract = await getContract(
    networkName,
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    true // Use signer for estimation
  );
  const signer = await contract.runner.provider.getSigner();
  const signerAddress = await signer.getAddress();

  if (signerAddress.toLowerCase() !== user._ethereumAddress.toLowerCase()) {
    throw new Error("Signer address does not match provided Ethereum address");
  }

  // Calculate required payment
  await contract.getLatestEthPrice(); // Ensure the contract is ready
  const ethPrice = await contract.getCachedEthPrice();
  const totalCostWei = await contract.calculateRequiredPayment(
    amount,
    ethPrice / BigInt(10e10)
  );

  // Debug: Log contract instance

  // Estimate gas for the transaction using the new syntax
  let gasEstimate;
  const nonce = getNonceFromUid(user._uid);
  try {
    gasEstimate = await contract.revealPurchase.estimateGas(amount, nonce, {
      value: totalCostWei,
    });
    console.log("Gas estimate for revealing:", gasEstimate.toString());
  } catch (estimateError) {
    console.error("estimateGas error details:", estimateError.data);

    if (estimateError.data && estimateError.data.startsWith("0x74cba217")) {
      throw new Error(
        "Transaction reverted: Insufficient energy available. Check available kWh and try a smaller amount."
      );
    }
    throw new Error(
      `Failed to estimate gas for revealPurchase: ${estimateError.message}. Check ABI, MetaMask connection, or contract state.`
    );
  }

  // Get gas price with fallback
  const feeData = await contract.runner.provider.getFeeData();
  let gasPrice = Number(feeData.gasPrice);
  console.log(
    "Initial gas price from feeData:",
    gasPrice?.toString() || "undefined"
  );
  if (!gasPrice || gasPrice === 0) {
    console.warn("Gas price is invalid or 0, using fallback of 10 Gwei");
    gasPrice = ethers.parseUnits("10", "gwei"); // Fallback gas price
  }

  const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
  console.log("Gas cost in wei:", gasCostInWei.toString());
  const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);

  // Energy cost is the totalCostWei (payment amount)
  const energyCostInEth = Number(ethers.formatEther(totalCostWei)).toFixed(6);

  // Total cost in ETH (calculate in wei first)
  const totalCostInWei = totalCostWei + gasCostInWei;
  const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(6);

  console.log("Total cost in ETH:", totalCostInEth);

  return {
    gasCostInEth,
    energyCostInEth,
    totalCostInEth,
    gasEstimate: gasEstimate,
  };
  //} catch (error) {
  //  throw new Error(
  //   `Error estimating gas for reveal purchase: ${error.message}`
  // );
  //}
};

export const getEthBalance = async (address, networkName = "sepolia") => {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }
    const targetConfig = NETWORK_CONFIG[networkName];
    const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    //console.log(`ETH Balance for ${address}: ${balanceEth} ETH`);
    return balanceEth;
  } catch (error) {
    console.error(`Error fetching ETH balance for ${address}:`, error.message);
    throw new Error(`Failed to fetch ETH balance: ${error.message}`);
  }
};

export const revealPurchase = async (networkName = "sepolia", amount, user) => {
  try {
    if (!amount || amount <= 0 || amount > 1000) {
      throw new Error("Amount must be between 1 and 1000 kWh");
    }
    if (!user || !user._ethereumAddress) {
      throw new Error("User Ethereum address is required");
    }
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true // Use signer
    );
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
    const totalCostWei = await contract.calculateRequiredPayment(
      amount,
      ethPrice / BigInt(10e10)
    );

    // Estimate gas for the transaction
    const gasEstimate = await contract.revealPurchase.estimateGas(
      amount,
      getNonceFromUid(user._uid),
      { value: totalCostWei }
    );
    const gasPrice = (await contract.runner.provider.getFeeData()).gasPrice;
    const gasCostInWei = BigInt(gasEstimate) * BigInt(gasPrice);
    const gasCostInEth = Number(ethers.formatEther(gasCostInWei)).toFixed(6);

    // Convert totalCostWei to ETH for display
    const energyCostInEth = Number(ethers.formatEther(totalCostWei)).toFixed(6);

    // Total cost in ETH
    const totalCostInWei = totalCostWei + gasCostInWei;
    const totalCostInEth = Number(ethers.formatEther(totalCostInWei)).toFixed(
      6
    );

    // Inform user of costs

    //if (!confirmation) throw new Error("Transaction cancelled by user");

    // Call revealPurchase
    const revealTx = await contract.revealPurchase(
      amount,
      getNonceFromUid(user._uid),
      { value: totalCostWei, gasLimit: gasEstimate }
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
export const getTransactions = async (networkName = "sepolia") => {
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
  console.log(user.ethereumAddress, "hi");
  if (!user || !user.ethereumAddress) {
    throw new Error(
      "User is not authenticated or does not have an Ethereum address."
    );
  }
  const contract = await getContract(
    "sepolia",
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    true
  );
  try {
    console.log(user.ethereumAddress ? "mawgoud" : "mesh mawgoud");
    const answer = await contract.checkAuthState(user.ethereumAddress);
    console.log("answer is");
    console.log(answer);
    return answer;
  } catch (error) {
    console.log(error);
  }
};

// this is for testing purposes only. for admin use

export const getMockPrice = async () => {
  const mockPriceContract = await getContract(
    "sepolia",
    MOCKP_RICE_ADDRESS,
    MOCKPRICE_ABI,
    false
  );

  return (await mockPriceContract.latestRoundData()).answer;
};

export const updateAnswer = async (price, networkName = "sepolia") => {
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

export const convertEthToUsd = async (ethAmount, networkName = "sepolia") => {
  //try {
  if (ethAmount <= 0) {
    throw new Error("ETH amount must be greater than zero");
  }

  // Fetch the latest ETH price in USD (in wei, scaled by 1e8 as per MockV3Aggregator)
  const ethPriceInWei = BigInt(await getLatestEthPrice(networkName));
  const ethPriceInUsd = Number(ethers.formatUnits(ethPriceInWei, 8)); // Adjust for 1e8 decimals

  // Convert ETH amount (in ETH) to USD
  console.log(ethAmount);
  const ethAmountInWei = Number(ethers.parseEther(ethAmount.toString()));
  const usdAmount = (
    Number(ethers.formatEther(ethAmountInWei)) * ethPriceInUsd
  ).toFixed(2);

  return {
    ethAmount: Number(ethAmount).toFixed(6), // ETH with 6 decimals
    usdAmount: usdAmount, // USD with 2 decimals
    ethPriceInUsd: ethPriceInUsd.toFixed(2), // Price per ETH in USD
  };
  // } catch (error) {
  //   throw new Error(`Error converting ETH to USD: ${error.message}`);
  // }
};

export const addEnergy = async (kwh, networkName = "sepolia") => {
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
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();

    const ownerAddress = await getSolarFarm();
    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      alert("Only the contract owner (solar farm) can add energy");
      throw new Error("Only the contract owner can add energy");
    }

    // Step 1: Request to add energy
    const requestTx = await contract.requestAddEnergy(kwh);
    await requestTx.wait();

    // Step 2: Wait for ADD_ENERGY_DELAY (2 minutes = 120,000 ms)
    const ADD_ENERGY_DELAY = 2 * 60 * 1000; // 2 minutes in milliseconds
    alert(
      `Please wait 2 minutes before confirming the energy addition. Transaction hash: ${requestTx.hash}`
    );
    await new Promise((resolve) => setTimeout(resolve, ADD_ENERGY_DELAY));

    // Step 3: Confirm adding energy
    const confirmTx = await contract.confirmAddEnergy(kwh);
    await confirmTx.wait();
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

// pause function
export const pauseContract = async (networkName = "sepolia") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();

    const ownerAddress = await getSolarFarm();
    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      alert("Only the contract owner (solar farm) can pause the contract");
      throw new Error("Only the contract owner can pause the contract");
    }

    const tx = await contract.pause();
    const receipt = await tx.wait();
    alert(`Contract paused successfully! Transaction hash: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    console.error("Error pausing contract:", error);
    let errorMessage =
      error.reason || error.message || "Failed to pause contract";
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
    alert(`Error pausing contract: ${errorMessage}`);
    throw new Error(`Error pausing contract: ${errorMessage}`);
  }
};

export const unpauseContract = async (networkName = "sepolia") => {
  try {
    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    const signer = await contract.runner.provider.getSigner();
    const signerAddress = await signer.getAddress();

    const ownerAddress = await getSolarFarm();
    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      alert("Only the contract owner (solar farm) can unpause the contract");
      throw new Error("Only the contract owner can unpause the contract");
    }

    const tx = await contract.unpause();
    const receipt = await tx.wait();
    alert(`Contract unpaused successfully! Transaction hash: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    console.error("Error unpausing contract:", error);
    let errorMessage =
      error.reason || error.message || "Failed to unpause contract";
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
    alert(`Error unpausing contract: ${errorMessage}`);
    throw new Error(`Error unpausing contract: ${errorMessage}`);
  }
};

export const isPaused = async () => {
  const contract = await getContract(
    "sepolia",
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    false
  );

  return await contract.paused();
};

export const authorizeParty = async (address, networkName = "sepolia") => {
  try {
    if (!ethers.isAddress(address)) {
      alert("Invalid Ethereum address");
      throw new Error("Invalid Ethereum address");
    }

    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    //await ensureContractOwner(contract, "authorize parties");

    const tx = await contract.authorizeParty(address);
    const receipt = await tx.wait();
    alert(`Party authorized successfully! Transaction hash: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    //handleTxError(error, "authorizing party");
  }
};

export const unauthorizeParty = async (address, networkName = "sepolia") => {
  try {
    if (!ethers.isAddress(address)) {
      alert("Invalid Ethereum address");
      throw new Error("Invalid Ethereum address");
    }
    console.log(address);

    const contract = await getContract(
      networkName,
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      true
    );
    //await ensureContractOwner(contract, "unauthorize parties");

    const tx = await contract.unAuthorizeParty(address);
    const receipt = await tx.wait();
    //alert(`Party unauthorized successfully! Transaction hash: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    //handleTxError(error, "unauthorizing party");
  }
};
