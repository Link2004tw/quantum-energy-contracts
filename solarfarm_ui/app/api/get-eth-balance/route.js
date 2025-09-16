// Prompt: Create a /api/get-eth-balance endpoint to fetch Ethereum balance
// Features:
// - Takes Ethereum address as query parameter
// - Requires Firebase ID token authentication
// - Optionally checks admin role via /api/verify-role
// - Validates Ethereum address using ethers.js
// - Returns balance in ETH as a decimal string
// - Handles errors for invalid address, auth, or network issues
// - Compatible with existing getEthBalance function

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { validateAuthToken } from "../utils";
import { getEthBalance } from "@/utils/contractUtils";

// GET /api/get-eth-balance?address=<ethereumAddress>
export async function GET(req) {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    const response = await validateAuthToken(authHeader);
    if (response.status !== 200) {
        return new Response(JSON.stringify({ error: response.error }), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        // Extract address from query parameters
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");

        if (!address) {
            return NextResponse.json({ error: "Missing address query parameter" }, { status: 400 });
        }

        // Validate Ethereum address
        if (!ethers.isAddress(address)) {
            return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
        }
        const balance = await getEthBalance(address);
        // Initialize Ethereum provider (replace with your provider, e.g., Infura)
        return NextResponse.json({
            success: true,
            address,
            balance: balance.toString(),
        });
    } catch (error) {
        console.error("Error fetching Ethereum balance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
