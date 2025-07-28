"use client";
import { useState } from "react";
import { ethers } from "ethers";
import AuthorizationRequest from "@/models/request"; //from "../../utils/AuthorizationRequest";
import { saveData } from "@/utils/databaseUtils";

export default function RequestItem({ request, contractConfig }) {
  const [status, setStatus] = useState(request.status);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthorize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create AuthorizationRequest instance
      const authRequest = new AuthorizationRequest(
        request.userId,
        request.ethereumAddress,
        request.metadata
      );

      // Submit authorization to contract
      await authRequest.submitToContract(
        contractConfig.contractAddress,
        contractConfig.contractAbi,
        signer
      );

      // Update status in Firebase
      authRequest.updateStatus("approved");
      await saveData(authRequest.toJSON(), `requests/${request.userId}`);
      setStatus("approved");
      alert("User authorized successfully!");
    } catch (error) {
      console.error("Authorization failed:", error);
      let errorMessage = error.reason || error.message || "Failed to authorize user.";
      if (error.reason === "Signer is not the contract owner.") {
        errorMessage = "Only the contract owner can authorize users.";
      }
      setError(errorMessage);
      setStatus("failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 m-4 max-w-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Authorization Request</h3>
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>User ID:</strong> {request.userId}</p>
        <p><strong>Ethereum Address:</strong> {request.ethereumAddress}</p>
        <p><strong>Name:</strong> {request.metadata.name}</p>
        <p><strong>Email:</strong> {request.metadata.email}</p>
        <p><strong>Reason:</strong> {request.metadata.reason}</p>
        <p><strong>Timestamp:</strong> {new Date(request.metadata.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> <span className={`font-medium ${status === "approved" ? "text-green-600" : status === "failed" ? "text-red-600" : "text-yellow-600"}`}>{status}</span></p>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <button
        onClick={handleAuthorize}
        disabled={isLoading || status === "approved"}
        className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium ${
          isLoading || status === "approved"
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {isLoading ? "Authorizing..." : status === "approved" ? "Already Authorized" : "Authorize User"}
      </button>
    </div>
  );
}