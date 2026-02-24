import { NextRequest, NextResponse } from "next/server";
import { getLeads } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const interest = searchParams.get("interest");

  let leads = getLeads();

  if (status) {
    leads = leads.filter((l) => l.status === status);
  }

  if (interest) {
    leads = leads.filter((l) => l.interest_level === interest);
  }

  return NextResponse.json(leads);
}
