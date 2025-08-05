// app/api/verify-role/route.js
import { adminAuth as admin } from "@/config/adminfirebase";


export async function GET(req) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "No token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const decodedToken = await admin.verifyIdToken(token);
    return new Response(
      JSON.stringify({ role: decodedToken.role || "user" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Token verification error:", err);
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}