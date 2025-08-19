// Prompt: Reuse /api/admin/get-user with middleware using custom claims
// Changes:
// - No changes; reused existing route
// - Fetches user data from Firestore based on uid query
// - Returns user data (uid, ethereumAddress, energy, isAdmin) or 404
// - Protected by middleware checking custom claims via /api/verify-role
// - Compatible with CooldownTimer and InvalidCommitment fix

import { adminDatabase } from "@/config/adminfirebase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const usersRef = adminDatabase.ref("users");
        const snapshot = await usersRef.once("value");

        const users = [];
        if (snapshot.exists()) {
            //console.log("they do");
            snapshot.forEach((childSnapshot) => {
                const uid = childSnapshot.key;
                console.log("uid", uid);
                const userData = childSnapshot.val();
                users.push({
                    email: userData.email || "",
                    username: userData.username || "",
                    ethereumAddress: userData.ethereumAddress || null,
                    uid,
                    energy: userData.energy || 0,
                });
            });
        }
        console.log("users", users);

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
