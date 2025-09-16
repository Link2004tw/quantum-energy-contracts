// Modified EnergyTransaction class to handle uranium purchases in pounds instead of kWh, compatible with UraniumPriceConsumer smart contract
import { v4 as uuidv4 } from "uuid";

export default class UraniumTransaction {
  constructor({
    // Replaced energyAmountKwh with uraniumAmountLbs to represent uranium quantity in pounds
    uraniumAmountLbs,
    transactionId = uuidv4(),
    timestamp = new Date().toISOString(),
    reqHash,
    conHash,
    uraniumPriceWhole = 0,
    uraniumPriceDecimal = 0,
  }) {
    // Updated validation to check uraniumAmountLbs instead of energyAmountKwh
    if (!uraniumAmountLbs || uraniumAmountLbs <= 0) {
      throw new Error("uraniumAmountLbs must be a positive number");
    }

    // Existing validation for uranium price fields
    if (uraniumPriceWhole < 0 || uraniumPriceDecimal < 0) {
      throw new Error(
        "uraniumPriceWhole and uraniumPriceDecimal must be non-negative numbers"
      );
    }

    // Updated field to store uranium amount
    this.uraniumAmountLbs = uraniumAmountLbs;
    // Existing fields
    this.transactionId = transactionId;
    this.timestamp = timestamp;
    this.requestHash = reqHash;
    this.confirmHash = conHash;
    // Existing uranium price fields
    this.uraniumPriceWhole = uraniumPriceWhole;
    this.uraniumPriceDecimal = uraniumPriceDecimal;
  }

  // Updated toJSON to include uraniumAmountLbs instead of energyAmountKwh
  toJSON() {
    return { ...this };
  }
}
