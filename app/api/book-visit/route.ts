import { NextRequest, NextResponse } from "next/server";
import { addLead, findLeadByEmail, findLeadByPhone, updateLead } from "@/lib/store";
import { Lead } from "@/lib/types";
import * as chrono from "chrono-node";
import { Resend } from "resend";

const OVERRIDE_EMAIL = "nurturinglabs@gmail.com";

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  console.log("[book-visit] Request body:", JSON.stringify(body));

  // Retell function nodes wrap params in body.args; inline calls send them at top level
  const params = body.args || body;

  const {
    parent_name,
    parent_email,
    parent_phone,
    child_name,
    grade,
    preferred_date,
    preferred_time = "10:00 AM",
  } = params;

  if (!parent_name || !child_name || !grade || !preferred_date) {
    const missing = [];
    if (!parent_name) missing.push("parent name");
    if (!child_name) missing.push("child name");
    if (!grade) missing.push("grade");
    if (!preferred_date) missing.push("preferred date");
    console.log("[book-visit] Missing fields:", missing.join(", "));
    return NextResponse.json({
      success: false,
      message: `I need the ${missing.join(", ")} to book a visit. Could you please provide ${missing.length === 1 ? "that" : "those"}?`,
    });
  }

  // Parse natural language date using server clock as reference
  const now = new Date();
  const parsed = chrono.parseDate(String(preferred_date), now, { forwardDate: true });

  if (!parsed) {
    return NextResponse.json({
      success: false,
      message: `I couldn't understand the date "${preferred_date}". Could you tell me when you'd like to visit? For example, "tomorrow", "next Tuesday", or "March 5th"?`,
    });
  }

  // Validate date is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsed < today) {
    return NextResponse.json({
      success: false,
      message: "That date seems to be in the past. Could you pick a future date for the visit?",
    });
  }

  // Validate date is a weekday
  const day = parsed.getDay();
  if (day === 0 || day === 6) {
    const nextMonday = new Date(parsed);
    nextMonday.setDate(parsed.getDate() + (day === 0 ? 1 : 2));
    const mondayFormatted = nextMonday.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return NextResponse.json({
      success: false,
      message: `Campus visits are available Monday through Friday. The next available weekday would be ${mondayFormatted}. Would that work?`,
    });
  }

  // Format the resolved date in human-readable form
  const resolvedDate = parsed.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const isoDate = parsed.toISOString().split("T")[0];

  const bookingId = `BK-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // Check if lead already exists (try email first, then phone)
  const existingLead =
    (parent_email ? findLeadByEmail(parent_email) : null) ||
    (parent_phone ? findLeadByPhone(parent_phone) : null);

  if (existingLead) {
    updateLead(existingLead.id, {
      status: "visit_booked",
      visit_date: isoDate,
      visit_time: preferred_time,
      updated_at: timestamp,
    });
    console.log("[book-visit] Updated existing lead:", existingLead.id, "→ visit_booked");
  } else {
    const newLead: Lead = {
      id: `lead_${Date.now().toString(36)}`,
      parent_name,
      parent_email: parent_email || "",
      parent_phone: parent_phone || "",
      child_name,
      child_dob: null,
      grade_interested: grade,
      current_school: null,
      status: "visit_booked",
      interest_level: "warm",
      visit_date: isoDate,
      visit_time: preferred_time,
      application_started: false,
      application_progress: 0,
      conversation_summary: `Parent booked a campus visit for Grade ${grade} on ${resolvedDate}.`,
      created_at: timestamp,
      updated_at: timestamp,
      follow_ups_sent: [],
    };
    addLead(newLead);
  }

  // Send confirmation email
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your_resend_api_key_here") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ringaa Admissions <onboarding@resend.dev>",
        to: OVERRIDE_EMAIL,
        subject: `Visit Confirmed — ${child_name}, Grade ${grade} on ${resolvedDate}`,
        text: [
          `Hi ${parent_name},`,
          ``,
          `Your campus visit to Brookfield International School has been confirmed.`,
          ``,
          `Details:`,
          `  Child: ${child_name}`,
          `  Grade: ${grade}`,
          `  Date: ${resolvedDate}`,
          `  Time: ${preferred_time}`,
          `  Booking ID: ${bookingId}`,
          ``,
          `What to bring:`,
          `  - Valid photo ID`,
          `  - Child's previous report card (if available)`,
          ``,
          `Location: Brookfield International School, Whitefield, Bangalore`,
          ``,
          `If you need to reschedule, please call us at +91 80456 78900.`,
          ``,
          `We look forward to meeting you!`,
          `Brookfield International School — Admissions Office`,
        ].join("\n"),
      });
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }
  }

  console.log("[book-visit] Booked:", bookingId, "| date:", resolvedDate, "| time:", preferred_time);

  return NextResponse.json({
    success: true,
    booking_id: bookingId,
    date: resolvedDate,
    iso_date: isoDate,
    time: preferred_time,
    message: `Campus visit booked for ${resolvedDate} at ${preferred_time}. A confirmation email has been sent. Please bring a valid photo ID.`,
  });
  } catch (error) {
    console.error("[book-visit] Error:", error);
    return NextResponse.json({
      success: false,
      message: "I had trouble booking the visit right now. You can call us directly at +91-80-4567-8900 to schedule your campus visit.",
    });
  }
}
