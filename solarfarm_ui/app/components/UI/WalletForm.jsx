// Prompt: create me a page where the admin has an input field to enter the address of a wallet to authorize it

"use client";

import { useState } from "react";
import Card from "@/app/components/Layout/Card"; // Adjust the import path based on your project structure

export default function WalletForm({ onSubmit, isAdd }) {
    // State to store the wallet address input
    const [walletAddress, setWalletAddress] = useState("");
    // State to store feedback message after submission
    const [message, setMessage] = useState("");

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation for wallet address (e.g., Ethereum address format)
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            setMessage("Please enter a valid Ethereum wallet address");
            return;
        }

        try {
            // Placeholder for API call to authorize wallet
            // Replace with your actual API endpoint
            onSubmit(walletAddress);
            setWalletAddress("");
        } catch (error) {
            setMessage("An error occurred. Please try again later.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            {/* Integrated the custom Card component */}
            <Card title="Authorize Wallet" maxWidth="max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Input field for wallet address */}
                    <div>
                        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
                            Wallet Address
                        </label>
                        <input
                            type="text"
                            id="walletAddress"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            placeholder="Enter wallet address (e.g., 0x...)"
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    {/* Submit button */}
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 transition"
                    >
                        {isAdd ? "Authorize Wallet" : "Unauthorize Wallet"}
                    </button>
                </form>
                {/* Feedback message */}
                {message && (
                    <p
                        className={`mt-4 text-center ${message.includes("success") ? "text-green-600" : "text-red-600"}`}
                    >
                        {message}
                    </p>
                )}
            </Card>
        </div>
    );
}
