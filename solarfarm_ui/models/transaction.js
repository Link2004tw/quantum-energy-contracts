// Modified Transaction class to handle uranium purchases in pounds instead of kWh, compatible with UraniumPriceConsumer smart contract
import { ethers } from "ethers";

export class Transaction {
  constructor({
    index,
    buyer,
    // Replaced kWh with uraniumAmountLbs to represent uranium quantity in pounds
    uraniumAmountLbs,
    // Replaced pricePerKWhUSD with uraniumPriceUSD to represent uranium price in USD (e.g., "12.34" from wholePart and decimalPart)
    uraniumPriceUSD,
    ethPriceUSD,
    timestamp,
    error,
    cost,
  }) {
    // Added validation for uraniumAmountLbs to ensure it's a positive number
    if (!uraniumAmountLbs || Number(uraniumAmountLbs) <= 0) {
      throw new Error("uraniumAmountLbs must be a positive number");
    }
    // Added validation for uraniumPriceUSD to ensure it's a non-negative number
    if (uraniumPriceUSD && Number(uraniumPriceUSD) < 0) {
      throw new Error("uraniumPriceUSD must be a non-negative number");
    }

    this.index = index; // Transaction index (number)
    this.buyer = buyer; // Buyer address (string)
    // Updated field for uranium amount
    this.uraniumAmountLbs = uraniumAmountLbs; // Uranium amount in pounds (string)
    // Updated field for uranium price
    this.uraniumPriceUSD = uraniumPriceUSD; // Uranium price in USD (string, e.g., "12.34")
    this.ethPriceUSD = ethPriceUSD; // ETH price in USD (string, assumed 18 decimals from Chainlink)
    this.timestamp = timestamp; // Unix timestamp in seconds (number)
    this.error = error; // Error message if fetch failed (string)
    this.cost = cost;
  }

  // Check if the transaction has an error (unchanged)
  hasError() {
    return !!this.error;
  }

  // Format address (shorten for display, unchanged)
  shortenAddress(address) {
    if (!address || !ethers.isAddress(address)) return "Invalid Address";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Get formatted buyer address (unchanged)
  getFormattedBuyer() {
    return this.shortenAddress(this.buyer);
  }

  // Replaced getFormattedPricePerKWh with getFormattedUraniumPrice to format uranium price in USD
  getFormattedUraniumPrice() {
    if (this.hasError()) return "N/A";
    return `$${Number(this.uraniumPriceUSD).toFixed(2)}`;
  }

  // Updated getFormattedEthPrice to clarify 18 decimals (Chainlink standard for ETH/USD)
  getFormattedEthPrice() {
    if (this.hasError()) return "N/A";
    return `$${(Number(this.ethPriceUSD) / 1e18).toFixed(2)}`;
  }

  // Get formatted timestamp (unchanged)
  getFormattedTimestamp() {
    if (this.hasError()) return "N/A";
    return new Date(this.timestamp * 1000).toLocaleString();
  }

  // Replaced getFormattedKWh with getFormattedUraniumAmount to format uranium amount
  getFormattedUraniumAmount() {
    if (this.hasError()) return "N/A";
    return `${this.uraniumAmountLbs} lbs`;
  }
  getFormattedCost() {
    if (this.hasError()) return "N/A";
    console.log(this.uraniumAmountLbs, this.uraniumPriceUSD);
    const USDcost =
      (Number(this.uraniumAmountLbs) * Number(this.uraniumPriceUSD)) / 100;
    return `$${USDcost.toFixed(2)}`;
  }

  // Updated toJSON to include uraniumAmountLbs and uraniumPriceUSD
  toJSON() {
    return {
      ...this,
    };
  }
}
