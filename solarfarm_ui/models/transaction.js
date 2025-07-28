import { ethers } from "ethers";

export class Transaction {
  constructor({
    index,
    buyer,
    kWh,
    pricePerKWhUSD,
    ethPriceUSD,
    timestamp,
    error,
  }) {
    this.index = index; // Transaction index (number)
    this.buyer = buyer; // Buyer address (string)
    this.kWh = kWh; // Energy amount in kWh (string)
    this.pricePerKWhUSD = pricePerKWhUSD; // Price per kWh in USD cents (string)
    this.ethPriceUSD = ethPriceUSD; // ETH price in USD (string)
    this.timestamp = timestamp; // Unix timestamp in seconds (number)
    this.error = error; // Error message if fetch failed (string)
  }

  // Check if the transaction has an error
  hasError() {
    return !!this.error;
  }

  // Format address (shorten for display)
  shortenAddress(address) {
    if (!address || !ethers.isAddress(address)) return "Invalid Address";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Get formatted buyer address
  getFormattedBuyer() {
    return this.shortenAddress(this.buyer);
  }

  // Get formatted price per kWh (USD cents to USD)
  getFormattedPricePerKWh() {
    if (this.hasError()) return "N/A";
    return `$${(Number(this.pricePerKWhUSD) / 100).toFixed(2)}`;
  }

  // Get formatted ETH price (assuming 8 decimals from Chainlink)
  getFormattedEthPrice() {
    if (this.hasError()) return "N/A";
    return `$${(Number(this.ethPriceUSD) / 1e18).toFixed(2)}`;
  }

  // Get formatted timestamp
  getFormattedTimestamp() {
    if (this.hasError()) return "N/A";
    return new Date(this.timestamp * 1000).toLocaleString();
  }

  // Get formatted kWh
  getFormattedKWh() {
    if (this.hasError()) return "N/A";
    return `${this.kWh} kWh`;
  }

  toJSON(){
    return {
      ...this
    }
  }
}
