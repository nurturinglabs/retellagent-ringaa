import initialLeads from "@/data/leads.json";
import seatsData from "@/data/seats.json";
import schoolData from "@/data/school.json";
import { Lead, SeatAvailability, SchoolInfo, FollowUpTemplate } from "./types";

// In-memory store — resets on cold start (fine for demo)
let leads: Lead[] = [...initialLeads] as Lead[];
const seats: { academic_year: string; availability: SeatAvailability[] } = {
  ...seatsData,
};
const school: SchoolInfo = schoolData as SchoolInfo;

// ── School ──
export function getSchool(): SchoolInfo {
  return school;
}

// ── Seats ──
export function getSeats(): SeatAvailability[] {
  return seats.availability;
}

export function getSeatByGrade(grade: string): SeatAvailability | undefined {
  return seats.availability.find(
    (s) => s.grade.toLowerCase() === grade.toLowerCase()
  );
}

// ── Leads ──
export function getLeads(): Lead[] {
  return leads;
}

export function getLeadById(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function addLead(lead: Lead): Lead {
  leads.push(lead);
  return lead;
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
  leads = leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
  return leads.find((l) => l.id === id);
}

export function findLeadByEmail(email: string): Lead | undefined {
  return leads.find((l) => l.parent_email === email);
}

export function findLeadByPhone(phone: string): Lead | undefined {
  const normalize = (p: string) => p.replace(/[\s\-()]+/g, "");
  const target = normalize(phone);
  return leads.find((l) => l.parent_phone && normalize(l.parent_phone) === target);
}

// ── Follow-up Templates ──
export const followUpTemplates: FollowUpTemplate[] = [
  {
    id: "visit_confirmation",
    name: "Visit Confirmation",
    trigger: "After visit booked",
    subject: "Your campus visit is confirmed!",
    body: "Dear {parent_name},\n\nYour visit to Brookfield International School is confirmed for {visit_date} at {visit_time}.\n\nPlease bring a valid photo ID and arrive 10 minutes early. We look forward to showing you and {child_name} our campus!\n\nWarm regards,\nAdmissions Team\nBrookfield International School",
  },
  {
    id: "post_visit_thanks",
    name: "Post-Visit Thanks",
    trigger: "After visit done",
    subject: "Thank you for visiting Brookfield!",
    body: "Dear {parent_name},\n\nIt was wonderful meeting you and {child_name} today. We hope you enjoyed touring our campus and getting a feel for the Brookfield experience.\n\nIf you have any questions or are ready to begin the application process, we're here to help!\n\nWarm regards,\nAdmissions Team\nBrookfield International School",
  },
  {
    id: "application_nudge",
    name: "Application Nudge",
    trigger: "Visit done, no application",
    subject: "Ready to secure {child_name}'s spot?",
    body: "Dear {parent_name},\n\nWe hope you enjoyed your visit to Brookfield. With only {available_seats} seats remaining for Grade {grade}, we wanted to remind you that early applications receive priority.\n\nWould you like to start the application process? It only takes a few minutes!\n\nWarm regards,\nAdmissions Team\nBrookfield International School",
  },
  {
    id: "seat_scarcity",
    name: "Seat Scarcity Alert",
    trigger: "Seats <= 3 for their grade",
    subject: "Only {available_seats} seats left for Grade {grade}!",
    body: "Dear {parent_name},\n\nWe wanted to let you know that seats for Grade {grade} are filling up fast — only {available_seats} remain for the 2026-27 academic year.\n\nTo secure {child_name}'s place, we recommend starting the application soon.\n\nWarm regards,\nAdmissions Team\nBrookfield International School",
  },
  {
    id: "re_engagement",
    name: "Re-engagement",
    trigger: "7+ days no activity",
    subject: "We'd love to hear from you!",
    body: "Dear {parent_name},\n\nWe noticed you were interested in Brookfield International School for {child_name}. We'd love to continue the conversation!\n\nWhether you'd like to schedule a campus visit, ask more questions, or start an application, our admissions team is here to help.\n\nWarm regards,\nAdmissions Team\nBrookfield International School",
  },
];
