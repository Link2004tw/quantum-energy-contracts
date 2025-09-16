// Prompt: Implement /api/get-csrf-token as a GET route using NextResponse
// Changes:
// - Used NextResponse for API response
// - Imported generateCsrfToken from "@/app/actions/usersContractActions"
// - Generated and stored CSRF token in httpOnly cookie
// - Returned token as JSON for client-side use
// - Ensured secure cookie settings (sameSite: strict, secure in production)

import { generateCsrfToken } from "@/app/actions/usersContractActions";
import { NextResponse } from "next/server";
import { validateAuthToken } from "../utils";

export async function GET(req) {
    try {
        // Generate CSRF token
        const authHeader = req.headers.get("authorization");
        const res = await validateAuthToken(authHeader);
        //console.log("Auth validation result:", res);
        if (res.status !== 200) {
            return new Response(JSON.stringify({ error: res.error }), {
                status: res.status,
                headers: { "Content-Type": "application/json" },
            });
        }
        const token = await generateCsrfToken();

        // Set cookie with secure settings
        const response = NextResponse.json({ token });
        response.cookies.set("csrfToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60, // 24 hours
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Error generating CSRF token:", error);
        return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
    }
}
