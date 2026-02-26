import { NextRequest, NextResponse } from "next/server";
import { getSeatByGrade } from "@/lib/store";

// Normalize grade input: "Grade 5", "grade-5", "fifth grade", "5" → "5"
function normalizeGrade(input: string): string {
  let g = input.trim().toLowerCase();
  // Remove "grade" / "class" prefix
  g = g.replace(/^(?:grade|class)[\s\-]*/, "").trim();
  // Remove "grade" / "class" suffix ("5th grade")
  g = g.replace(/[\s\-]*(?:grade|class)$/, "").trim();
  // Convert ordinals: "5th" → "5", "1st" → "1"
  g = g.replace(/(\d+)(?:st|nd|rd|th)/, "$1");
  // Convert word numbers
  const wordToNum: Record<string, string> = {
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    eleven: "11", twelve: "12",
    first: "1", second: "2", third: "3", fourth: "4", fifth: "5",
    sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10",
    eleventh: "11", twelfth: "12",
  };
  if (wordToNum[g]) g = wordToNum[g];
  // Capitalize for named grades
  if (g === "nursery") return "Nursery";
  if (g === "lkg" || g === "l.k.g" || g === "lower kg") return "LKG";
  if (g === "ukg" || g === "u.k.g" || g === "upper kg") return "UKG";
  return g;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[check-seats] Request body:", JSON.stringify(body));

    // Retell function nodes wrap params in body.args; inline calls send them at top level
    const params = body.args || body;
    const { grade } = params;

    if (!grade) {
      // Return 200 with error message — Retell needs 200 to relay the message
      return NextResponse.json({
        success: false,
        message: "I need to know which grade you're interested in to check seat availability. Could you tell me the grade?",
      });
    }

    const normalized = normalizeGrade(grade);
    console.log("[check-seats] Grade:", grade, "→ normalized:", normalized);

    const seat = getSeatByGrade(normalized);

    if (!seat) {
      // Return 200 — agent needs a readable response
      return NextResponse.json({
        success: false,
        message: `I couldn't find seat information for "${grade}". We offer Nursery, LKG, UKG, and Grades 1 through 12. Could you please specify which grade?`,
      });
    }

    let status: string;
    if (seat.available === 0) {
      status = "full";
    } else if (seat.available <= 3) {
      status = "limited";
    } else {
      status = "available";
    }

    console.log("[check-seats] Result:", JSON.stringify({ grade: seat.grade, available: seat.available, status }));

    return NextResponse.json({
      success: true,
      grade: seat.grade,
      available: seat.available,
      total: seat.total,
      filled: seat.filled,
      status,
      message: seat.available === 0
        ? `Grade ${seat.grade} is currently full with all ${seat.total} seats taken. However, we do maintain a waitlist. I'd recommend booking a campus visit — sometimes spots open up.`
        : `Great news! We have ${seat.available} seats available out of ${seat.total} in Grade ${seat.grade} for the 2026-27 academic year. ${status === "limited" ? "Seats are limited, so I'd recommend acting soon." : ""}`,
    });
  } catch (error) {
    console.error("[check-seats] Error:", error);
    return NextResponse.json({
      success: false,
      message: "I'm having trouble checking seat availability right now. Let me help you with something else, or you can call us directly at +91-80-4567-8900.",
    });
  }
}
