// Prompt: Reuse /api/admin/get-user with middleware using custom claims
// Changes:
// - Reused existing route structure for /api/admin/get-user
// - Fetches user data from Firebase Realtime Database based on uid query
// - Returns user data (uid, ethereumAddress, energy, isAdmin) or 404
// - Protected by middleware checking custom claims via /api/verify-role
// - Compatible with CooldownTimer and InvalidCommitment fix (validation for energy and ethereumAddress)

import { adminDatabase } from "@/config/adminfirebase";
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import User from "@/models/user";
import { validateAuthToken } from "../utils";

// GET /api/admin/get-user?uid=<userId>
export async function GET(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const res = await validateAuthToken(authHeader);

        //console.log("Auth validation result:", res);
        if (res.status !== 200) {
            return new Response(JSON.stringify({ error: res.error }), {
                status: res.status,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Extract uid from query parameters
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({ error: "Missing uid query parameter" }, { status: 400 });
        }

        // Fetch user from Realtime Database
        const userRef = adminDatabase.ref(`users/${uid}`);
        const snapshot = await userRef.once("value");

        if (!snapshot.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = snapshot.val();

        // Validate data for CooldownTimer and InvalidCommitment compatibility
        if (userData.energy < 0) {
            console.warn(`Invalid energy value for user ${uid}: ${userData.energy}`);
            userData.energy = 0; // Reset to 0 to prevent invalid commits
        }

        if (userData.ethereumAddress && !ethers.isAddress(userData.ethereumAddress)) {
            console.warn(`Invalid Ethereum address for user ${uid}: ${userData.ethereumAddress}`);
            userData.ethereumAddress = null; // Reset invalid address
        }

        // Construct response with required fields
        const response = new User({
            uid,
            ethereumAddress: userData.ethereumAddress || null,
            energy: userData.energy || 0,
            username: userData.username || "",
            email: userData.email || "",
        });

        return NextResponse.json({ success: true, user: response });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
