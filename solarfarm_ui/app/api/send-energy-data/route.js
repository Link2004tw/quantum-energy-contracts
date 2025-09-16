//import { getAvailableEnergy, getLatestEthPriceWC } //from "@/utils/contractUtils";
import { NextResponse } from "next/server";
import { validateAuthToken } from "../utils";
import {
  getAvailableUraniumLbs,
  getLatestEthPriceWC,
} from "@/utils/contractUtils";

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
    const uranium = await getAvailableUraniumLbs();
    const ethPrice = await getLatestEthPriceWC(); //getLatestEthPriceWC();

    return NextResponse.json(
      { status: "ok", energy: uranium.toString(), ethPrice },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error in send-energy-data route:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
