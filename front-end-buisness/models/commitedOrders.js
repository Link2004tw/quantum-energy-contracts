//here is the class that has the energy requested and the hash of the transaction with the help of Grok
export default class CommittedOrders {
  constructor({ energyRequested, transactionHash, uid, ethereumAddress, nonce, createdAt }) {
    if (!energyRequested ) {
      throw new Error("Energy requested must be at least psositive");
    }
    if(!transactionHash){
      throw new Error("error ya3am");
    }
    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      console.log(transactionHash);
      throw new Error("Invalid transaction hash");
    }
    if (!uid || typeof uid !== "string") {
      throw new Error("Invalid Firebase UID");
    }
    if (!ethereumAddress || !/^0x[a-fA-F0-9]{40}$/.test(ethereumAddress)) {
      throw new Error("Invalid Ethereum address");
    }
    this._energyRequested = energyRequested;
    this._transactionHash = transactionHash;
    this._uid = uid;
    this._ethereumAddress = ethereumAddress;
    this._nonce = nonce || null; // Optional, derived from uid if needed
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Getter methods
  get energyRequested() {
    return this._energyRequested;
  }

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

  // Convert to object for Firebase storage
  toFirebase() {
    return {
      energyRequested: this._energyRequested,
      transactionHash: this._transactionHash,
      uid: this._uid,
      ethereumAddress: this._ethereumAddress,
      nonce: this._nonce,
      createdAt: this._createdAt.toISOString(),
    };
  }
}