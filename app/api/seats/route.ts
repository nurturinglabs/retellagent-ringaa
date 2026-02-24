import { NextResponse } from "next/server";
import { getSeats } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getSeats());
}
