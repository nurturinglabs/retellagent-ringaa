"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lead } from "@/lib/types";

const templates = [
  {
    id: "visit_confirmation",
    name: "Visit Confirmation",
    trigger: "After visit booked",
    description: "Confirms campus visit date, time, and what to bring",
  },
  {
    id: "post_visit_thanks",
    name: "Post-Visit Thanks",
    trigger: "After visit done",
    description: "Thank you note after campus tour with next steps",
  },
  {
    id: "application_nudge",
    name: "Application Nudge",
    trigger: "Visit done, no application",
    description: "Encourages parents to start the application process",
  },
  {
    id: "seat_scarcity",
    name: "Seat Scarcity Alert",
    trigger: "Seats <= 3 for their grade",
    description: "Urgency message when seats are running low",
  },
  {
    id: "re_engagement",
    name: "Re-engagement",
    trigger: "7+ days no activity",
    description: "Re-engages cold or inactive leads",
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FollowUpsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then(setLeads);
  }, []);

  const allFollowUps = leads
    .flatMap((lead) =>
      lead.follow_ups_sent.map((fu) => ({
        ...fu,
        parent_name: lead.parent_name,
        child_name: lead.child_name,
        grade: lead.grade_interested,
      }))
    )
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());

  const totalSent = allFollowUps.length;
  const leadsWithFollowUp = leads.filter((l) => l.follow_ups_sent.length > 0).length;
  const leadsWithout = leads.filter((l) => l.follow_ups_sent.length === 0).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage follow-up templates and track sent messages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-slate-500">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsWithFollowUp}</p>
                <p className="text-xs text-slate-500">Leads Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsWithout}</p>
                <p className="text-xs text-slate-500">Pending Follow-up</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Follow-up Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border border-slate-200 rounded-lg p-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {t.trigger}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{t.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {allFollowUps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No follow-ups sent yet. Use the Leads page to send follow-ups.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allFollowUps.map((fu, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{fu.parent_name}</TableCell>
                    <TableCell>{fu.child_name}</TableCell>
                    <TableCell>{fu.grade}</TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">
                        {fu.type.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {fu.channel === "sms" ? (
                          <MessageSquare className="w-3 h-3" />
                        ) : fu.channel === "whatsapp" ? (
                          <Phone className="w-3 h-3" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        <span className="text-sm capitalize">
                          {fu.channel || "email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDate(fu.sent_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
