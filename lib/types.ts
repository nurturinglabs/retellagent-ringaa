export interface SchoolInfo {
  name: string;
  tagline: string;
  location: string;
  established: number;
  affiliation: string;
  total_students: number;
  student_teacher_ratio: string;
  campus_size: string;
  programs: Program[];
  facilities: string[];
  admission_fee: number;
  sibling_discount: string;
  timings: string;
  contact: { phone: string; email: string; website: string };
}

export interface Program {
  name: string;
  grades: string;
  ages: string;
  curriculum: string;
  annual_fee: number;
}

export interface SeatAvailability {
  grade: string;
  total: number;
  filled: number;
  available: number;
}

export interface Lead {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  child_name: string;
  child_dob: string | null;
  grade_interested: string;
  current_school: string | null;
  status: LeadStatus;
  interest_level: "hot" | "warm" | "cold";
  visit_date: string | null;
  visit_time: string | null;
  application_started: boolean;
  application_progress: number;
  conversation_summary: string;
  created_at: string;
  updated_at: string;
  follow_ups_sent: FollowUp[];
}

export type LeadStatus =
  | "new"
  | "interested"
  | "visit_booked"
  | "visit_done"
  | "applied"
  | "enrolled"
  | "cold"
  | "lost";

export interface FollowUp {
  type: string;
  sent_at: string;
  channel?: string;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  trigger: string;
  subject: string;
  body: string;
}
