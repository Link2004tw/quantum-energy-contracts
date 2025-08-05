import { adminAuth, adminDatabase } from "@/config/adminfirebase"; // Adjust path to your Firebase Admin config

// Simple Ethereum address validation
const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export async function POST(req) {
  // Extract the Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Missing or invalid token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  const idToken = authHeader.split("Bearer ")[1];

  // Parse request body
  let addresses;
  try {
    const body = await req.json();
    addresses = Array.isArray(body.addresses) ? body.addresses : [body.address]; // Support single address
    console.log(2);
    console.log(addresses);
  } catch (error) {
    console.log(4);
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate Ethereum addresses
  if (
    !addresses.every(
      (addr) => addr && typeof addr === "string" && isValidEthereumAddress(addr)
    )
  ) {
    console.log(5);
    return new Response(
      JSON.stringify({
        error: "One or more invalid or missing Ethereum addresses",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    console.log(6);
    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(7);

    // Fetch the existing addresses array
    const addressesRef = adminDatabase.ref("registeredAddresses");
    const snapshot = await addressesRef.once("value");
    console.log(8);
    const existingAddresses = snapshot.exists() ? snapshot.val() : [];
    console.log(existingAddresses);
    // Check which addresses already exist
    const results = addresses.map((ethAddress) => {
      const trimmedAddress = ethAddress.trim().toLowerCase();
      const exists =
        Array.isArray(existingAddresses) &&
        existingAddresses.includes(trimmedAddress);
      return { ethAddress: trimmedAddress, exists };
    });
    console.log(results);

    // Add new addresses to the array
    const newAddresses = results
      .filter((result) => !result.exists)
      .map((result) => result.ethAddress);

    if (newAddresses.length > 0) {
      const updatedAddresses = [...existingAddresses, ...newAddresses];
      await addressesRef.set(updatedAddresses);
      console.log("Added new addresses:", newAddresses);
    }

    const exists = results.some((r) => r.exists)

    return new Response(JSON.stringify({ exists }), {
      status: newAddresses.length > 0 ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing Ethereum addresses:", error);
    if (
      error.code === "auth/id-token-expired" ||
      error.code === "auth/invalid-id-token"
    ) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
