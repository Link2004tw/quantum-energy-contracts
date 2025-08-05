import { v4 as uuidv4 } from 'uuid';


export default class EnergyTransaction {
  constructor({
    energyAmountKwh,
    transactionId = uuidv4(),
    timestamp = new Date().toISOString(),
    reqHash,
    conHash
  }) {
    if (!energyAmountKwh || energyAmountKwh <= 0) {
      throw new Error("energyAmountKwh must be a positive number");
    }

    this.transactionId = transactionId;
    this.timestamp = timestamp;
    this.energyAmountKwh = energyAmountKwh;
    this.requestHash = reqHash;
    this.confirmHash = conHash;
  }

  toJSON() {
    return { ...this};
  }
}
