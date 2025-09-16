export const truncateTransactionHash = (transactionHash) => {
  if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    throw new Error("Invalid transaction hash");
  }

  return `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`;
};

export const truncateEthereumAddress = (address) => {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid Ethereum address");
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const convertUraniumUnits = (amount, unitMode, targetUnit = "lbs") => {
  // Validate input amount
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Uranium amount must be a valid number greater than zero");
  }

  // Validate unit mode and target unit
  if (!["kg", "lbs"].includes(unitMode)) {
    throw new Error("Invalid source unit: must be 'kg' or 'lbs'");
  }
  if (!["kg", "lbs"].includes(targetUnit)) {
    throw new Error("Invalid target unit: must be 'kg' or 'lbs'");
  }

  // Conversion factor: 1 kg = 2.20462 lbs
  const KG_TO_LBS = 2.20462;

  // Perform conversion
  if (unitMode === targetUnit) {
    return parsedAmount.toFixed(4); // Return as-is, rounded to 4 decimal places
  } else if (unitMode === "kg" && targetUnit === "lbs") {
    // Convert kg to lbs
    return (parsedAmount * KG_TO_LBS).toFixed(4);
  } else {
    // Convert lbs to kg
    return (parsedAmount / KG_TO_LBS).toFixed(4);
  }
};
