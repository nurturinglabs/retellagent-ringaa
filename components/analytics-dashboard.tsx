"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  GraduationCap,
  Calendar,
  Clock,
} from "lucide-react";
import { Lead, SeatAvailability } from "@/lib/types";

// ── Constants ────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  interested: "Interested",
  visit_booked: "Visit Booked",
  visit_done: "Visit Done",
  applied: "Applied",
  enrolled: "Enrolled",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#94a3b8",
  interested: "#60a5fa",
  visit_booked: "#fbbf24",
  visit_done: "#a78bfa",
  applied: "#34d399",
  enrolled: "#10b981",
};

const INTEREST_COLORS: Record<string, string> = {
  hot: "#ef4444",
  warm: "#f59e0b",
  cold: "#94a3b8",
};

function formatGradeLabel(grade: string): string {
  if (["Nursery", "LKG", "UKG"].includes(grade)) return grade;
  return `Gr ${grade}`;
}

// ── Compute time-series data from actual leads ───────────────

type BarRow = { label: string; newL: number; interested: number; visit: number; applied: number };

function bucketLeads(leads: Lead[], bucketStart: Date, bucketEnd: Date): Omit<BarRow, "label"> {
  const b = leads.filter((l) => {
    const d = new Date(l.created_at);
    return d >= bucketStart && d <= bucketEnd;
  });
  return {
    newL: b.filter((l) => l.status === "new" || l.status === "interested").length,
    interested: b.filter((l) => l.status === "visit_booked" || l.status === "visit_done").length,
    visit: b.filter((l) => l.status === "applied").length,
    applied: b.filter((l) => l.status === "enrolled").length,
  };
}

function computeChartData(leads: Lead[], period: "daily" | "weekly" | "monthly"): BarRow[] {
  if (leads.length === 0) return [];

  const rows: BarRow[] = [];

  if (period === "daily") {
    // Last 14 days
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      rows.push({
        label: day.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ...bucketLeads(leads, day, dayEnd),
      });
    }
  } else if (period === "weekly") {
    // Weeks from Jan 5 through now
    const current = new Date("2026-01-05");
    const now = new Date();
    while (current <= now) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      rows.push({
        label: current.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ...bucketLeads(leads, current, weekEnd),
      });
      current.setDate(current.getDate() + 7);
    }
  } else {
    // Monthly: Jan, Feb
    const months = [
      { start: new Date("2026-01-01"), end: new Date("2026-01-31T23:59:59.999Z"), label: "Jan" },
      { start: new Date("2026-02-01"), end: new Date("2026-02-28T23:59:59.999Z"), label: "Feb" },
    ];
    for (const m of months) {
      rows.push({ label: m.label, ...bucketLeads(leads, m.start, m.end) });
    }
  }

  return rows;
}

// ── Tiny stat card ───────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  trend,
  trendLabel,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  trend?: "up" | "down";
  trendLabel?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-3">
      <div className="flex items-start justify-between mb-1.5">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
            trend === "up" ? "text-emerald-600" : "text-red-500"
          }`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendLabel && <span>{trendLabel}</span>}
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────

export function AnalyticsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [seats, setSeats] = useState<SeatAvailability[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/seats").then((r) => r.json()),
    ]).then(([leadsData, seatsData]) => {
      setLeads(leadsData);
      setSeats(seatsData);
    });
  }, []);

  // ── Filter leads by selected period ─────────────────────

  const { filteredLeads, periodLabel } = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    let label: string;

    if (period === "daily") {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      label = "Last 7 days";
    } else if (period === "weekly") {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 28);
      cutoff.setHours(0, 0, 0, 0);
      label = "Last 4 weeks";
    } else {
      cutoff = new Date("2026-01-01");
      label = "Jan – Feb 2026";
    }

    const filtered = leads.filter((l) => new Date(l.created_at) >= cutoff);
    return { filteredLeads: filtered, periodLabel: label };
  }, [leads, period]);

  // ── Metrics (all from filteredLeads) ───────────────────

  const totalSeats = seats.reduce((s, g) => s + g.total, 0);
  const filledSeats = seats.reduce((s, g) => s + g.filled, 0);
  const occupancyRate = totalSeats > 0 ? Math.round((filledSeats / totalSeats) * 100) : 0;
  const criticalGrades = seats.filter((s) => s.available <= 2).length;

  const totalLeads = filteredLeads.length;
  const hotLeads = filteredLeads.filter((l) => l.interest_level === "hot").length;
  const visitedLeads = filteredLeads.filter(
    (l) => ["visit_booked", "visit_done", "applied", "enrolled"].includes(l.status)
  ).length;
  const appliedLeads = filteredLeads.filter(
    (l) => l.status === "applied" || l.status === "enrolled"
  ).length;

  const inquiryToVisit = totalLeads > 0 ? Math.round((visitedLeads / totalLeads) * 100) : 0;
  const visitToApply = visitedLeads > 0 ? Math.round((appliedLeads / visitedLeads) * 100) : 0;

  const totalFollowUps = filteredLeads.reduce((s, l) => s + l.follow_ups_sent.length, 0);
  const leadsWithFollowUp = filteredLeads.filter((l) => l.follow_ups_sent.length > 0).length;
  const followUpCoverage = totalLeads > 0 ? Math.round((leadsWithFollowUp / totalLeads) * 100) : 0;

  const gradeCount: Record<string, number> = {};
  filteredLeads.forEach((l) => { gradeCount[l.grade_interested] = (gradeCount[l.grade_interested] || 0) + 1; });
  const peakGrade = Object.entries(gradeCount).sort((a, b) => b[1] - a[1])[0];

  const daysInPeriod = period === "daily" ? 7 : period === "weekly" ? 28 : 52;
  const weeksInPeriod = Math.max(1, Math.ceil(daysInPeriod / 7));
  const avgLeadsPerWeek = totalLeads > 0 ? (totalLeads / weeksInPeriod).toFixed(1) : "0";

  // ── Chart Data ───────────────────────────────────────────

  const chartData = useMemo(() => computeChartData(filteredLeads, period), [filteredLeads, period]);

  const interestData = (["hot", "warm", "cold"] as const).map((level) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: filteredLeads.filter((l) => l.interest_level === level).length,
    color: INTEREST_COLORS[level],
  }));

  const seatChartData = seats.map((s) => ({
    grade: formatGradeLabel(s.grade),
    filled: s.filled,
    available: s.available,
    total: s.total,
    occupancy: Math.round((s.filled / s.total) * 100),
  }));

  const statusData = (["new", "interested", "visit_booked", "visit_done", "applied", "enrolled"] as const).map((status) => {
    const count = filteredLeads.filter((l) => l.status === status).length;
    return { status, label: STATUS_LABELS[status], count, pct: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0, color: STATUS_COLORS[status] };
  });


  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-80px)]">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admissions Insights</h1>
          <p className="text-xs text-slate-500">{periodLabel} · {totalLeads} leads · {seats.length} grades</p>
        </div>
        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium ${
                period === p ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── 6 Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3 flex-shrink-0">
        <StatCard icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" value={totalLeads} label="Total Leads" trend="up" trendLabel="+2" />
        <StatCard icon={Target} iconBg="bg-red-50" iconColor="text-red-500" value={hotLeads} label="Hot Leads" trend="up" />
        <StatCard icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" value={`${inquiryToVisit}%`} label="Conversion" trend="up" />
        <StatCard icon={GraduationCap} iconBg="bg-amber-50" iconColor="text-amber-600" value={`${occupancyRate}%`} label="Seat Occupancy" trend="up" />
        <StatCard icon={Clock} iconBg="bg-violet-50" iconColor="text-violet-600" value={peakGrade ? formatGradeLabel(peakGrade[0]) : "–"} label="Peak Grade" />
        <StatCard icon={Calendar} iconBg="bg-teal-50" iconColor="text-teal-600" value={avgLeadsPerWeek} label="Avg / Week" trend="up" />
      </div>

      {/* ── Row 1: Stacked bar (large) + Donut (small) ── */}
      <div className="grid grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">
        {/* Lead Volume — stacked bar */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead Volume by Status</h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />New</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-400 inline-block" />Interested</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Visit</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Applied</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px", padding: "6px 10px" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="newL" stackId="a" fill="#60a5fa" name="New" />
                <Bar dataKey="interested" stackId="a" fill="#94a3b8" name="Interested" />
                <Bar dataKey="visit" stackId="a" fill="#fbbf24" name="Visit" />
                <Bar dataKey="applied" stackId="a" fill="#34d399" name="Applied" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interest Breakdown — donut */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex-shrink-0">Interest Breakdown</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={interestData} cx="50%" cy="50%" innerRadius="40%" outerRadius="65%" paddingAngle={4} dataKey="value">
                  {interestData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 flex-shrink-0 pt-1 border-t border-slate-100">
            {interestData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{d.value}</span>
                  <span className="text-slate-400 w-8 text-right">{totalLeads > 0 ? Math.round((d.value / totalLeads) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Seat Occupancy + Conversion Insights + Status Overview ── */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Seat Occupancy */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex-shrink-0">Seat Occupancy</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seatChartData} margin={{ top: 0, right: 0, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 8, fill: "#94a3b8" }} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  formatter={(value, name, props) => {
                    const p = (props as { payload?: { total?: number; occupancy?: number } })?.payload;
                    if (name === "Filled" && p) return [`${value}/${p.total} (${p.occupancy}%)`, name];
                    return [value, name];
                  }}
                />
                <Bar dataKey="filled" stackId="s" fill="#1e40af" name="Filled" />
                <Bar dataKey="available" stackId="s" fill="#dbeafe" name="Available" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion Insights */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex-shrink-0">Conversion Insights</h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Inquiry → Visit</span>
                <span className="text-xs font-bold text-blue-700">{inquiryToVisit}%</span>
              </div>
              <ProgressBar value={inquiryToVisit} max={100} color="#3b82f6" />
              <p className="text-[10px] text-slate-400 mt-0.5">{visitedLeads} of {totalLeads} leads</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Visit → Apply</span>
                <span className="text-xs font-bold text-emerald-700">{visitToApply}%</span>
              </div>
              <ProgressBar value={visitToApply} max={100} color="#10b981" />
              <p className="text-[10px] text-slate-400 mt-0.5">{appliedLeads} of {visitedLeads} visitors</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Follow-up Coverage</span>
                <span className="text-xs font-bold text-amber-700">{followUpCoverage}%</span>
              </div>
              <ProgressBar value={followUpCoverage} max={100} color="#f59e0b" />
              <p className="text-[10px] text-slate-400 mt-0.5">{leadsWithFollowUp} of {totalLeads} contacted</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Critical Grades</span>
                <span className="text-xs font-bold text-red-600">{criticalGrades}</span>
              </div>
              <ProgressBar value={criticalGrades} max={seats.length} color="#ef4444" />
              <p className="text-[10px] text-slate-400 mt-0.5">{criticalGrades} of {seats.length} near full</p>
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex-shrink-0">Status Overview</h3>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {statusData.map((s) => (
              <div key={s.status}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-600">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{s.count}</span>
                    <span className="text-[10px] text-slate-400">({s.pct}%)</span>
                  </div>
                </div>
                <ProgressBar value={s.count} max={totalLeads} color={s.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-5 py-2 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-base font-bold text-slate-900">{hotLeads}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1.5">Hot</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="text-center">
            <span className="text-base font-bold text-slate-900">{totalFollowUps}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1.5">Follow-ups</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="text-center">
            <span className="text-base font-bold text-slate-900">{filledSeats}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1.5">Seats Filled</span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400">Powered by Ringaa AI</span>
      </div>
    </div>
  );
}
