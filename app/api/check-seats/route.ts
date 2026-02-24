import { NextRequest, NextResponse } from "next/server";
import { getSeatByGrade } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { grade } = body;

  if (!grade) {
    return NextResponse.json(
      { error: "Grade is required" },
      { status: 400 }
    );
  }

  const seat = getSeatByGrade(grade);

  if (!seat) {
    return NextResponse.json(
      { error: `Grade "${grade}" not found` },
      { status: 404 }
    );
  }

  let status: string;
  if (seat.available === 0) {
    status = "full";
  } else if (seat.available <= 3) {
    status = "limited";
  } else {
    status = "available";
  }

  return NextResponse.json({
    grade: seat.grade,
    available: seat.available,
    total: seat.total,
    filled: seat.filled,
    status,
  });
}
