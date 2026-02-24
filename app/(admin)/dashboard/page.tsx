"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  FileText,
  Flame,
  TrendingUp,
  ArrowRight,
  Phone,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lead, SeatAvailability } from "@/lib/types";

const statusColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  interested: "bg-blue-100 text-blue-700",
  visit_booked: "bg-amber-100 text-amber-700",
  visit_done: "bg-purple-100 text-purple-700",
  applied: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  new: "New",
  interested: "Interested",
  visit_booked: "Visit Booked",
  visit_done: "Visit Done",
  applied: "Applied",
};

const RINGAA_PHONE =
  process.env.NEXT_PUBLIC_RINGAA_PHONE || "+1 (262) 384-6288";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [seats, setSeats] = useState<SeatAvailability[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/seats").then((r) => r.json()),
    ]).then(([l, s]) => {
      setLeads(l);
      setSeats(s);
    });
  }, []);

  const stats = {
    total: leads.length,
    visits: leads.filter(
      (l) => l.status === "visit_booked" || l.status === "visit_done"
    ).length,
    applications: leads.filter((l) => l.status === "applied").length,
    hot: leads.filter((l) => l.interest_level === "hot").length,
  };

  const totalSeats = seats.reduce((s, g) => s + g.total, 0);
  const filledSeats = seats.reduce((s, g) => s + g.filled, 0);
  const criticalGrades = seats.filter((s) => s.available <= 2);

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Admissions overview for Academic Year 2026-27
        </p>
      </div>

      {/* Retell Phone Number Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">
                  Ringaa Voice Agent (Retell AI)
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {RINGAA_PHONE}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-700 font-medium">
                Active 24/7
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.visits}</p>
                <p className="text-xs text-slate-500">Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.applications}</p>
                <p className="text-xs text-slate-500">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hot}</p>
                <p className="text-xs text-slate-500">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Link href="/leads">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.parent_name}</p>
                    <p className="text-xs text-slate-500">
                      {lead.child_name} &middot; Grade {lead.grade_interested}
                    </p>
                  </div>
                  <Badge
                    className={
                      statusColors[lead.status] || "bg-slate-100 text-slate-700"
                    }
                  >
                    {statusLabels[lead.status] || lead.status}
                  </Badge>
                </div>
              ))}
              {leads.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No leads yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seat Capacity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Seat Capacity</CardTitle>
            <Link href="/knowledge-base">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">
                  Overall Occupancy
                </span>
                <span className="text-sm font-semibold">
                  {totalSeats > 0
                    ? Math.round((filledSeats / totalSeats) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${
                      totalSeats > 0
                        ? (filledSeats / totalSeats) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {filledSeats} filled of {totalSeats} total seats
              </p>
            </div>

            {criticalGrades.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 mb-2">
                  Near Capacity ({criticalGrades.length} grades)
                </p>
                <div className="flex flex-wrap gap-2">
                  {criticalGrades.map((s) => (
                    <Badge
                      key={s.grade}
                      className={
                        s.available === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      Gr {s.grade}:{" "}
                      {s.available === 0 ? "Full" : `${s.available} left`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Admissions Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(
              [
                "new",
                "interested",
                "visit_booked",
                "visit_done",
                "applied",
              ] as const
            ).map((status, i) => {
              const count = leads.filter((l) => l.status === status).length;
              const colors = [
                "bg-slate-100 text-slate-700",
                "bg-blue-100 text-blue-700",
                "bg-amber-100 text-amber-700",
                "bg-purple-100 text-purple-700",
                "bg-green-100 text-green-700",
              ];
              return (
                <div key={status} className="flex items-center">
                  <div
                    className={`rounded-lg px-4 py-3 text-center min-w-[90px] ${colors[i]}`}
                  >
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs">{statusLabels[status]}</p>
                  </div>
                  {i < 4 && (
                    <ArrowRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
