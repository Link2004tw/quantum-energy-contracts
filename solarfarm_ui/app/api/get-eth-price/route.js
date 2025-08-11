// Prompt: Create a Next.js API route for get-eth-price using getLatestEthPriceWC from contract.js
import { NextResponse } from "next/server";
import { getLatestEthPriceWC } from "@/utils/adminContact"; //from "../../../utils/contract";

// GET /api/get-eth-price
export async function GET(request) {
    try {
        console.log("in get-enth");
        // Changed: Call getLatestEthPriceWC from contract.js
        const ethPrice = await getLatestEthPriceWC();
        console.log(ethPrice);
        return NextResponse.json(
            {
                success: true,
                network: networkName,
                ethPrice: ethPrice.toFixed(2), // Format to 2 decimals
            },
            { status: 200 },
        );
    } catch (error) {
        console.log("error");
        console.log(error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 },
        );
    }
}
