// Prompt: Fix error "set failed: value argument contains undefined in property 'registeredAddresses.1'" by filtering undefined/invalid values in existingAddresses
import { adminDatabase } from "@/config/adminfirebase"; // Adjust path to your Firebase Admin config
import { validateAuthToken } from "../utils";

// Simple Ethereum address validation
const isValidEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export async function POST(req) {
    // Extract the Authorization header
    const authHeader = req.headers.get("authorization");
    const response = await validateAuthToken(authHeader);
    if (response.status !== 200) {
        return new Response(JSON.stringify({ error: response.error }), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    }
    // Parse request body
    let addresses;
    try {
        const body = await req.json();
        addresses = Array.isArray(body.addresses) ? body.addresses : [body.address]; // Support single address
        // Filter out empty, null, undefined, or invalid Ethereum addresses
        addresses = addresses.filter((addr) => addr && typeof addr === "string" && isValidEthereumAddress(addr.trim()));
        console.log("Filtered input addresses:", addresses);

        // Check if any valid addresses remain
        if (addresses.length === 0) {
            console.log("No valid addresses provided");
            return new Response(JSON.stringify({ error: "No valid Ethereum addresses provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error) {
        console.log("Error parsing request body:", error);
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        // Fetch the existing addresses array
        const addressesRef = adminDatabase.ref("registeredAddresses");
        const snapshot = await addressesRef.once("value");
        let existingAddresses = snapshot.exists() ? snapshot.val() : [];

        // Added: Ensure existingAddresses is an array and filter out undefined, null, empty, or invalid addresses
        if (!Array.isArray(existingAddresses)) {
            console.error("existingAddresses is not an array:", existingAddresses);
            return new Response(
                JSON.stringify({ error: "Internal server error: Invalid data structure in registeredAddresses" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }
        existingAddresses = existingAddresses.filter(
            (addr) => addr && typeof addr === "string" && isValidEthereumAddress(addr.trim()),
        );
        console.log("Filtered existing addresses:", existingAddresses);

        // Check which addresses already exist
        const results = addresses.map((ethAddress) => {
            const trimmedAddress = ethAddress.trim().toLowerCase();
            const exists = existingAddresses.includes(trimmedAddress);
            return { ethAddress: trimmedAddress, exists };
        });
        console.log("Address check results:", results);

        // Add new addresses to the array
        const newAddresses = results.filter((result) => !result.exists).map((result) => result.ethAddress);

        if (newAddresses.length > 0) {
            console.log("Existing addresses:", existingAddresses, "New addresses:", newAddresses);
            const updatedAddresses = [...existingAddresses, ...newAddresses];
            await addressesRef.set(updatedAddresses);
            console.log("Added new addresses:", newAddresses);
        }

        const exists = results.some((r) => r.exists);

        return new Response(JSON.stringify({ exists }), {
            status: newAddresses.length > 0 ? 201 : 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error processing Ethereum addresses:", error);
        if (error.code === "auth/id-token-expired" || error.code === "auth/invalid-id-token") {
            return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
