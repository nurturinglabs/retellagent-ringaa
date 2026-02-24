"use client";

import { useState } from "react";
import {
  GraduationCap,
  DollarSign,
  Armchair,
  Building2,
  Bus,
  ClipboardList,
  FileText,
  HelpCircle,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import kb from "@/data/knowledge-base.json";

const tabs = [
  { id: "profile", label: "Profile", icon: GraduationCap },
  { id: "fees", label: "Fees", icon: DollarSign },
  { id: "seats", label: "Seats", icon: Armchair },
  { id: "facilities", label: "Facilities", icon: Building2 },
  { id: "transport", label: "Transport", icon: Bus },
  { id: "admission", label: "Admission", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">
        {label}
      </label>
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
        {value}
      </div>
    </div>
  );
}

function ProfileTab() {
  const p = kb.profile;
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">School Profile</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FieldDisplay label="School Name" value={p.school_name} />
        <FieldDisplay label="Address" value={p.address} />
        <FieldDisplay label="City" value={p.city} />
        <FieldDisplay label="Area" value={p.area} />
        <FieldDisplay label="Phone" value={p.phone} />
        <FieldDisplay label="Email" value={p.email} />
        <FieldDisplay label="Website" value={p.website} />
        <FieldDisplay label="Board" value={p.board} />
        <FieldDisplay label="Grades From" value={p.grades_from} />
        <FieldDisplay label="Grades To" value={p.grades_to} />
        <FieldDisplay label="Medium" value={p.medium} />
        <FieldDisplay label="School Timings" value={p.school_timings} />
        <FieldDisplay label="Principal Name" value={p.principal_name} />
        <FieldDisplay label="Established Year" value={String(p.established_year)} />
        <FieldDisplay label="Total Students" value={String(p.total_students)} />
        <FieldDisplay label="Campus Size" value={p.campus_size} />
        <FieldDisplay label="Student-Teacher Ratio" value={p.student_teacher_ratio} />
      </div>
    </div>
  );
}

function FeesTab() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">Fee Structure (2026-27)</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Grades</TableHead>
              <TableHead className="text-right">Tuition Fee</TableHead>
              <TableHead className="text-right">Admission Fee</TableHead>
              <TableHead className="text-right">Annual Charges</TableHead>
              <TableHead className="text-right">1st Year Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kb.fees.map((fee) => (
              <TableRow key={fee.program}>
                <TableCell className="font-medium">{fee.program}</TableCell>
                <TableCell className="text-slate-500">{fee.grades}</TableCell>
                <TableCell className="text-right">{formatCurrency(fee.tuition_fee)}</TableCell>
                <TableCell className="text-right">{formatCurrency(fee.admission_fee)}</TableCell>
                <TableCell className="text-right">{formatCurrency(fee.annual_charges)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(fee.total_first_year)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fee Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex gap-2">
            <Badge variant="outline" className="shrink-0">Sibling</Badge>
            <span>{kb.fee_notes.sibling_discount}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="shrink-0">Payment</Badge>
            <span>{kb.fee_notes.payment_modes}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="shrink-0">Late Fee</Badge>
            <span>{kb.fee_notes.late_fee}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="shrink-0">Refund</Badge>
            <span>{kb.fee_notes.refund_policy}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SeatsTab() {
  // Import seats from the same data used by the agent
  const [seats, setSeats] = useState<{ grade: string; total: number; filled: number; available: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    fetch("/api/seats")
      .then((r) => r.json())
      .then((data) => {
        setSeats(data);
        setLoaded(true);
      });
  }

  const totalSeats = seats.reduce((s, g) => s + g.total, 0);
  const filledSeats = seats.reduce((s, g) => s + g.filled, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Seat Availability (2026-27)</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">
            Total: <span className="font-semibold text-slate-800">{totalSeats}</span>
          </span>
          <span className="text-slate-500">
            Filled: <span className="font-semibold text-blue-700">{filledSeats}</span>
          </span>
          <span className="text-slate-500">
            Available: <span className="font-semibold text-green-700">{totalSeats - filledSeats}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Total Seats</TableHead>
              <TableHead className="text-right">Filled</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Occupancy</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((s) => {
              const pct = Math.round((s.filled / s.total) * 100);
              return (
                <TableRow key={s.grade}>
                  <TableCell className="font-medium">Grade {s.grade}</TableCell>
                  <TableCell className="text-right">{s.total}</TableCell>
                  <TableCell className="text-right">{s.filled}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {s.available}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            pct >= 95
                              ? "bg-red-500"
                              : pct >= 85
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        s.available === 0
                          ? "bg-red-100 text-red-700"
                          : s.available <= 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }
                    >
                      {s.available === 0
                        ? "Full"
                        : s.available <= 3
                        ? "Limited"
                        : "Open"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FacilitiesTab() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">Campus Facilities</h3>
      {kb.facilities.map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="text-sm">{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {category.items.map((item) => (
                <div
                  key={item.name}
                  className="flex gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransportTab() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">School Transport</h3>
      <p className="text-sm text-slate-600">{kb.transport.overview}</p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Areas Covered</TableHead>
              <TableHead className="text-right">Stops</TableHead>
              <TableHead className="text-right">Monthly Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kb.transport.routes.map((route) => (
              <TableRow key={route.route_no}>
                <TableCell>
                  <Badge variant="outline">{route.route_no}</Badge>
                </TableCell>
                <TableCell>{route.area}</TableCell>
                <TableCell className="text-right">{route.stops}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(route.monthly_fee)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safety Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kb.transport.safety_features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdmissionTab() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">Admission Process</h3>

      {/* Steps */}
      <div className="space-y-3">
        {kb.admission.process_steps.map((step) => (
          <div key={step.step} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {step.step}
            </div>
            <div className="flex-1 pb-3 border-b border-slate-100 last:border-0">
              <p className="text-sm font-medium text-slate-800">{step.title}</p>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Age Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Age Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Min Age</TableHead>
                <TableHead>Max Age</TableHead>
                <TableHead>As of</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kb.admission.age_criteria.map((c) => (
                <TableRow key={c.grade}>
                  <TableCell className="font-medium">{c.grade}</TableCell>
                  <TableCell>{c.min_age}</TableCell>
                  <TableCell>{c.max_age}</TableCell>
                  <TableCell className="text-slate-500">{c.as_of}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(kb.admission.important_dates).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-500 capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-medium text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">Required Documents</h3>

      {[
        { title: "New Admission", docs: kb.documents.new_admission },
        { title: "Transfer Admission", docs: kb.documents.transfer_admission },
        { title: "Scholarship Application", docs: kb.documents.scholarship },
      ].map(({ title, docs }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docs.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-slate-600"
                >
                  <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0">
                    {i + 1}
                  </div>
                  {doc}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FAQTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-slate-800">Frequently Asked Questions</h3>
      <div className="space-y-2">
        {kb.faq.map((item, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800 pr-4">
                {item.question}
              </span>
              {openIndex === i ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {openIndex === i && (
              <div className="px-4 pb-3 text-sm text-slate-600 border-t border-slate-100 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_COMPONENTS: Record<string, () => React.ReactNode> = {
  profile: ProfileTab,
  fees: FeesTab,
  seats: SeatsTab,
  facilities: FacilitiesTab,
  transport: TransportTab,
  admission: AdmissionTab,
  documents: DocumentsTab,
  faq: FAQTab,
};

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState("profile");

  const TabContent = TAB_COMPONENTS[activeTab];

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your school information used by the AI assistant
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? "border-blue-800 text-blue-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        <TabContent />
      </div>
    </div>
  );
}
