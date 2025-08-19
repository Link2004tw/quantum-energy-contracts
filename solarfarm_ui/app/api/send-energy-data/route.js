import { getAvailableEnergy, getLatestEthPriceWC } from "@/utils/contractUtils";
import { NextResponse } from "next/server";
import { validateAuthToken } from "../utils";

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        const response = await validateAuthToken(authHeader);
        if (response.status !== 200) {
            return new Response(JSON.stringify({ error: response.error }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }
        const energy = await getAvailableEnergy();
        const ethPrice = await getLatestEthPriceWC();

        return NextResponse.json({ status: "ok", energy: energy.toString(), ethPrice }, { status: 200 });
    } catch (error) {
        console.log("Error in send-energy-data route:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
