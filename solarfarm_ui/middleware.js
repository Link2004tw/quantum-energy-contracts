// middleware.js
import { NextResponse } from "next/server";

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("__session")?.value;
  if (!token) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  try {
    const verifyResponse = await fetch(`${req.nextUrl.origin}/api/verify-role`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!verifyResponse.ok) {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    const { role } = await verifyResponse.json();
    if (role !== "admin") {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*"], // protect all /admin/* routes
};
