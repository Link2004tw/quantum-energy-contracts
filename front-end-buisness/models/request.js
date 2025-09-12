import { ethers } from "ethers";

class AuthorizationRequest {
  constructor(userId, ethereumAddress, metadata = {}) {
    if (!userId || typeof userId !== "string") {
      console.log(userId);
      throw new Error("Invalid or missing userId.");
    }
    if (!ethereumAddress || !ethers.isAddress(ethereumAddress)) {
      console.log(ethereumAddress);
      throw new Error("Invalid or missing Ethereum address.");
    }
    this.userId = userId;
    this.ethereumAddress = ethereumAddress;
    this.metadata = {
      name: metadata.name || "Unknown",
      email: metadata.email || "N/A",
      reason: metadata.reason || "Authorization request",
      timestamp: metadata.timestamp || new Date().toISOString(),
    };
    this.status = "pending"; // Initial status
  }

  // Formats the request as a human-readable string for admin notification
  toNotificationString() {
    return `
      Authorization Request:
      User ID: ${this.userId}
      Ethereum Address: ${this.ethereumAddress}
      Name: ${this.metadata.name}
      Email: ${this.metadata.email}
      Reason: ${this.metadata.reason}
      Timestamp: ${this.metadata.timestamp}
      Status: ${this.status}
    `;
  }

  // Formats the request as a JSON object for API or storage
  toJSON() {
    return {
      userId: this.userId,
      ethereumAddress: this.ethereumAddress,
      metadata: this.metadata,
      status: this.status,
    };
  }

  // Submits the authorization request to the EnergyContract
  async submitToContract(contractAddress, contractAbi, signer) {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error("Invalid contract address.");
    }
    if (!contractAbi) {
      throw new Error("Contract ABI is required.");
    }
    if (!signer) {
      throw new Error("Signer is required.");
    }

    try {
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
      // Verify signer is the contract owner
      const owner = await contract.owner();
      if (owner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
        throw new Error("Signer is not the contract owner.");
      }

      // Call authorizeParty
      const tx = await contract.authorizeParty(this.ethereumAddress);
      console.log(`Authorization transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
      this.status = "submitted";
      return receipt;
    } catch (error) {
      console.error("Failed to submit authorization request:", error);
      this.status = "failed";
      throw error;
    }
  }

  // Updates the request status (e.g., after admin action)
  updateStatus(newStatus) {
    const validStatuses = ["pending", "submitted", "approved", "rejected", "failed"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    this.status = newStatus;
  }
}

export default AuthorizationRequest;