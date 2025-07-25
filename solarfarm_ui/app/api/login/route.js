import { NextResponse } from "next/server";

export async function POST(req) {
  console.log("ana henak fel api");
  const { idToken  } = await req.json();
  console.log(idToken);
  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const res = NextResponse.json({ status: "ok" });

  // Set the cookie — must be "__session"
  res.cookies.set("__session", idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: "strict",
  });

  return res;
}
