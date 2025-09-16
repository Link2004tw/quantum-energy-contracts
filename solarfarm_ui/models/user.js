// Modified User class to handle uranium holdings in pounds instead of energy in kWh, compatible with UraniumPriceConsumer smart contract
class User {
  constructor({
    email,
    username,
    ethereumAddress,
    uid,
    // Replaced energy with uraniumLbs to represent uranium holdings in pounds
    uraniumLbs = 0,
  }) {
    // Added validation for uraniumLbs to ensure it's a non-negative number
    if (uraniumLbs < 0) {
      throw new Error("uraniumLbs must be a non-negative number");
    }

    this._email = email || "";
    this._username = username || "";
    this._ethereumAddress = this._validateEthereumAddress(ethereumAddress)
      ? ethereumAddress
      : null;
    this._uid = uid;
    // Updated field to store uranium holdings
    this._uraniumLbs = uraniumLbs;
  }

  // Validate Ethereum address (basic check for 0x + 40 hex characters, unchanged)
  _validateEthereumAddress(address) {
    if (!address) return false;
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    return isValid;
  }

  // Getters (unchanged except for uraniumLbs)
  get email() {
    return this._email;
  }

  get username() {
    return this._username;
  }

  get ethereumAddress() {
    return this._ethereumAddress;
  }

  // Replaced energy getter with uraniumLbs
  get uraniumLbs() {
    return this._uraniumLbs;
  }

  // Replaced energy setter with uraniumLbs
  set uraniumLbs(amount) {
    // Added validation for setter to ensure non-negative amount
    if (amount < 0) {
      throw new Error("uraniumLbs must be a non-negative number");
    }
    this._uraniumLbs = amount;
  }

  get uid() {
    return this._uid;
  }

  // Updated toJSON to include uraniumLbs instead of energy
  toJSON() {
    return {
      email: this._email,
      username: this._username,
      ethereumAddress: this._ethereumAddress,
      uraniumLbs: this._uraniumLbs,
    };
  }
}

export default User;
