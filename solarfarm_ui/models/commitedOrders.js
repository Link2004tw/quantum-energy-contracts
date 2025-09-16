// Modified CommittedOrders class to handle uranium purchases in pounds instead of energy in kWh, compatible with UraniumPriceConsumer smart contract
export default class CommittedOrders {
  constructor({
    // Replaced energyRequested with uraniumAmountLbs to represent uranium quantity in pounds
    uraniumAmountLbs,
    transactionHash,
    uid,
    ethereumAddress,
    nonce,
    createdAt,
  }) {
    // Updated validation to check uraniumAmountLbs instead of energyRequested
    if (!uraniumAmountLbs || uraniumAmountLbs <= 0) {
      throw new Error("uraniumAmountLbs must be a positive number");
    }
    // Existing validation for transactionHash
    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      throw new Error("Invalid transaction hash");
    }
    // Existing validation for uid
    if (!uid || typeof uid !== "string") {
      throw new Error("Invalid Firebase UID");
    }
    // Existing validation for ethereumAddress
    if (!ethereumAddress || !/^0x[a-fA-F0-9]{40}$/.test(ethereumAddress)) {
      throw new Error("Invalid Ethereum address");
    }

    // Updated field to store uranium amount
    this._uraniumAmountLbs = uraniumAmountLbs;
    // Existing fields
    this._transactionHash = transactionHash;
    this._uid = uid;
    this._ethereumAddress = ethereumAddress;
    this._nonce = nonce || null; // Optional, derived from uid if needed
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Updated getter for uraniumAmountLbs
  get uraniumAmountLbs() {
    return this._uraniumAmountLbs;
  }

  // Existing getter methods
  get transactionHash() {
    return this._transactionHash;
  }

  get uid() {
    return this._uid;
  }

  get ethereumAddress() {
    return this._ethereumAddress;
  }

  get nonce() {
    return this._nonce;
  }

  get createdAt() {
    return this._createdAt;
  }

  // Updated toFirebase to include uraniumAmountLbs instead of energyRequested
  toFirebase() {
    return {
      uraniumAmountLbs: this._uraniumAmountLbs,
      transactionHash: this._transactionHash,
      uid: this._uid,
      ethereumAddress: this._ethereumAddress,
      nonce: this._nonce,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
