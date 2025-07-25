class User {
  constructor({
    email,
    username,
    password,
    birthday,
    ethereumAddress,
    uid,
    token,
    energy = 0,
  }) {
    this._email = email || "";
    this._username = username || "";
    this._password = password || "";
    this._birthday = birthday ? new Date(birthday) : null;
    this._ethereumAddress = this._validateEthereumAddress(ethereumAddress)
      ? ethereumAddress
      : null;
    this._uid = uid;
    this._energy = energy;
    this._token = token
  }

  // Validate Ethereum address (basic check for 0x + 40 hex characters)
  _validateEthereumAddress(address) {
    if (!address) return false;
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    return isValid;
  }

  // Getters
  get email() {
    return this._email;
  }

  get username() {
    return this._username;
  }

  get birthday() {
    return this._birthday;
  }

  get ethereumAddress() {
    return this._ethereumAddress;
  }

  get energy() {
    return this._energy;
  }
  get token() {
    return this._token
  }
  set energy(amount){
    this._energy = amount;
  }

  // Exclude password from serialization for security
  toJSON() {
    return {
      email: this._email,
      username: this._username,
      birthday: this._birthday ? this._birthday.toDateString() : null,
      ethereumAddress: this._ethereumAddress,
      energy: this._energy,
      token: this._token
    };
  }
}

export default User;
