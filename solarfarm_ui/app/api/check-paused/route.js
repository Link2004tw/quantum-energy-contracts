import { isPaused } from "@/utils/contract";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const contractPaused = await isPaused();
    return NextResponse.json({ isPaused: contractPaused }, { status: 200 });
  } catch (error) {
    console.error('Error checking pause state:', error);
    return NextResponse.json(
      { error: `Failed to check pause state: ${error.message}` },
      { status: 500 }
    );
  }
}