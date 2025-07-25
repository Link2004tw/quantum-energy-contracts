export const truncateTransactionHash = (transactionHash) => {
  if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    console.log(transactionHash);
    throw new Error("Invalid transaction hash");
  }

  return `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`;
};

export const truncateEthereumAddress = (address) => {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.log("Invalid address:", address);
    throw new Error("Invalid Ethereum address");
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
