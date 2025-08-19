import { NextResponse } from "next/server";
import { getData } from "@/utils/adminDatabaseUtils";
import CommittedOrders from "@/models/commitedOrders";
import { validateAuthToken } from "../utils";

export async function GET(req) {
    try {
        // Extract uid from query parameters
        const authHeader = req.headers.get("authorization");
        const res = await validateAuthToken(authHeader);
        //console.log("Auth validation result:", res);
        if (res.status !== 200) {
            return new Response(JSON.stringify({ error: res.error }), {
                status: res.status,
                headers: { "Content-Type": "application/json" },
            });
        }
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({ error: "Missing uid query parameter" }, { status: 400 });
        }

        // Fetch user from Realtime Database
        const data = await getData(`committedOrders/${uid}`);
        // Construct response with required fields

        const orders = [];
        if (data) {
            // Convert Firebase data to CommittedOrders instances
            Object.entries(data).map(([orderId, orderData]) =>
                orders.push(
                    new CommittedOrders({
                        energyRequested: orderData.energyRequested,
                        transactionHash: orderData.transactionHash,
                        uid: orderData.uid,
                        ethereumAddress: orderData.ethereumAddress,
                        nonce: orderData.nonce,
                        createdAt: orderData.createdAt,
                    }).toFirebase(),
                ),
            );

            //console.log("Fetched orders:", ordersArray);
        }

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
