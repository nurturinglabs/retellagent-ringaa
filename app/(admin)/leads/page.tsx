"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flame,
  Eye,
  Send,
  Mail,
  MessageSquare,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lead, FollowUpTemplate } from "@/lib/types";

const statusColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  interested: "bg-blue-100 text-blue-700",
  visit_booked: "bg-amber-100 text-amber-700",
  visit_done: "bg-purple-100 text-purple-700",
  applied: "bg-green-100 text-green-700",
  enrolled: "bg-emerald-100 text-emerald-800",
  cold: "bg-slate-100 text-slate-500",
  lost: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  new: "New",
  interested: "Interested",
  visit_booked: "Visit Booked",
  visit_done: "Visit Done",
  applied: "Applied",
  enrolled: "Enrolled",
  cold: "Cold",
  lost: "Lost",
};

const interestIcons: Record<string, React.ReactNode> = {
  hot: <Flame className="w-4 h-4 text-red-500" />,
  warm: <Flame className="w-4 h-4 text-amber-500" />,
  cold: <Flame className="w-4 h-4 text-slate-400" />,
};

const templates: FollowUpTemplate[] = [
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
    body: "Dear {parent_name},\n\nIt was wonderful meeting you and {child_name} today. We hope you enjoyed touring our campus.\n\nIf you have any questions or are ready to begin the application process, we're here to help!\n\nWarm regards,\nAdmissions Team",
  },
  {
    id: "application_nudge",
    name: "Application Nudge",
    trigger: "Visit done, no application",
    subject: "Ready to secure {child_name}'s spot?",
    body: "Dear {parent_name},\n\nWe hope you enjoyed your visit to Brookfield. With limited seats remaining for Grade {grade}, we wanted to remind you that early applications receive priority.\n\nWould you like to start the application process? It only takes a few minutes!\n\nWarm regards,\nAdmissions Team",
  },
  {
    id: "seat_scarcity",
    name: "Seat Scarcity Alert",
    trigger: "Seats <= 3",
    subject: "Only a few seats left for Grade {grade}!",
    body: "Dear {parent_name},\n\nWe wanted to let you know that seats for Grade {grade} are filling up fast for the 2026-27 academic year.\n\nTo secure {child_name}'s place, we recommend starting the application soon.\n\nWarm regards,\nAdmissions Team",
  },
  {
    id: "re_engagement",
    name: "Re-engagement",
    trigger: "7+ days no activity",
    subject: "We'd love to hear from you!",
    body: "Dear {parent_name},\n\nWe noticed you were interested in Brookfield International School for {child_name}. We'd love to continue the conversation!\n\nWarm regards,\nAdmissions Team",
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function renderTemplate(template: string, lead: Lead): string {
  return template
    .replace(/{parent_name}/g, lead.parent_name)
    .replace(/{child_name}/g, lead.child_name)
    .replace(/{grade}/g, lead.grade_interested)
    .replace(/{visit_date}/g, lead.visit_date || "TBD")
    .replace(/{visit_time}/g, lead.visit_time || "TBD");
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    templates[0].id
  );
  const [selectedChannel, setSelectedChannel] = useState("email");
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => setLeads(data));
  }, []);

  const filteredLeads =
    activeTab === "all"
      ? leads
      : leads.filter((l) => l.status === activeTab);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "created_at" ? "desc" : "asc");
    }
  };

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (sortColumn) {
        case "parent_name":
          valA = a.parent_name.toLowerCase();
          valB = b.parent_name.toLowerCase();
          break;
        case "child_name":
          valA = a.child_name.toLowerCase();
          valB = b.child_name.toLowerCase();
          break;
        case "grade_interested":
          valA = a.grade_interested.toLowerCase();
          valB = b.grade_interested.toLowerCase();
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        case "interest_level": {
          const order: Record<string, number> = { hot: 3, warm: 2, cold: 1 };
          valA = order[a.interest_level] || 0;
          valB = order[b.interest_level] || 0;
          break;
        }
        case "created_at":
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLeads, sortColumn, sortDirection]);

  const tabCounts: Record<string, number> = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    interested: leads.filter((l) => l.status === "interested").length,
    visit_booked: leads.filter((l) => l.status === "visit_booked").length,
    visit_done: leads.filter((l) => l.status === "visit_done").length,
    applied: leads.filter((l) => l.status === "applied").length,
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const handleFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setFollowUpOpen(true);
    setSuccessMessage("");
  };

  const handleSendFollowUp = useCallback(async () => {
    if (!selectedLead) return;
    setSendingFollowUp(true);

    try {
      const res = await fetch(
        `/api/leads/${selectedLead.id}/follow-up`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: selectedTemplate,
            channel: selectedChannel,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          `Follow-up sent via ${selectedChannel}!`
        );
        const leadsRes = await fetch("/api/leads");
        const newLeads = await leadsRes.json();
        setLeads(newLeads);
      }
    } catch {
      setSuccessMessage("Failed to send. Please try again.");
    } finally {
      setSendingFollowUp(false);
    }
  }, [selectedLead, selectedTemplate, selectedChannel]);

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track and manage your admissions leads
        </p>
      </div>

      {/* Lead Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
          <CardDescription>
            {leads.length} total leads across all stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {Object.entries(tabCounts).map(([key, count]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {statusLabels[key] || "All"} ({count})
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      { key: "parent_name", label: "Parent" },
                      { key: "child_name", label: "Child" },
                      { key: "grade_interested", label: "Grade" },
                      { key: "status", label: "Status" },
                      { key: "interest_level", label: "Interest" },
                      { key: "created_at", label: "Date" },
                    ].map(({ key, label }) => (
                      <TableHead
                        key={key}
                        className="cursor-pointer select-none hover:text-slate-900 transition-colors"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortColumn === key ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-slate-400 py-8"
                      >
                        No leads found in this category
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.parent_name}
                        </TableCell>
                        <TableCell>{lead.child_name}</TableCell>
                        <TableCell>{lead.grade_interested}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[lead.status] || statusColors.new
                            }
                          >
                            {statusLabels[lead.status] || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {interestIcons[lead.interest_level]}
                            <span className="capitalize text-sm">
                              {lead.interest_level}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(lead.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLead(lead)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFollowUp(lead)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {sortedLeads.length === 0 ? (
                <p className="text-center text-slate-400 py-8">
                  No leads found
                </p>
              ) : (
                sortedLeads.map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{lead.parent_name}</p>
                          <p className="text-sm text-slate-500">
                            {lead.child_name} &middot; Grade{" "}
                            {lead.grade_interested}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {interestIcons[lead.interest_level]}
                          <Badge
                            className={
                              statusColors[lead.status] || statusColors.new
                            }
                          >
                            {statusLabels[lead.status]}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                        {lead.conversation_summary}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleViewLead(lead)}
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleFollowUp(lead)}
                        >
                          <Send className="w-3 h-3" />
                          Follow-up
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lead Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[90vw] sm:w-[480px] overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Lead Details
                  <Badge
                    className={
                      statusColors[selectedLead.status] || statusColors.new
                    }
                  >
                    {statusLabels[selectedLead.status]}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    Parent Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name</span>
                      <span className="font-medium">
                        {selectedLead.parent_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span>{selectedLead.parent_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone</span>
                      <span>{selectedLead.parent_phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    Child Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name</span>
                      <span className="font-medium">
                        {selectedLead.child_name}
                      </span>
                    </div>
                    {selectedLead.child_dob && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date of Birth</span>
                        <span>{selectedLead.child_dob}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Grade Interested</span>
                      <span>{selectedLead.grade_interested}</span>
                    </div>
                    {selectedLead.current_school && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current School</span>
                        <span className="text-right max-w-[55%]">
                          {selectedLead.current_school}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLead.visit_date && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">
                      Campus Visit
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date</span>
                        <span>{selectedLead.visit_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Time</span>
                        <span>{selectedLead.visit_time}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedLead.application_started && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">
                      Application
                    </h3>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${selectedLead.application_progress}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedLead.application_progress}% complete
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    Conversation Summary
                  </h3>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                    {selectedLead.conversation_summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    Follow-up History
                  </h3>
                  {selectedLead.follow_ups_sent.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No follow-ups sent yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedLead.follow_ups_sent.map((fu, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-2.5"
                        >
                          <span className="capitalize">
                            {fu.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatDate(fu.sent_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gap-2 bg-blue-800 hover:bg-blue-900"
                  onClick={() => {
                    setSheetOpen(false);
                    handleFollowUp(selectedLead);
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send Follow-up
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Follow-up Dialog */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Follow-up</DialogTitle>
            <DialogDescription>
              {selectedLead
                ? `Send a follow-up message to ${selectedLead.parent_name}`
                : "Select a lead first"}
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Template
                </label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentTemplate && (
                  <p className="text-xs text-slate-400 mt-1">
                    Trigger: {currentTemplate.trigger}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Channel
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "email", label: "Email", icon: Mail },
                    { id: "sms", label: "SMS", icon: MessageSquare },
                    { id: "whatsapp", label: "WhatsApp", icon: Phone },
                  ].map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={selectedChannel === id ? "default" : "outline"}
                      size="sm"
                      className={
                        selectedChannel === id
                          ? "bg-blue-800 hover:bg-blue-900 gap-1.5"
                          : "gap-1.5"
                      }
                      onClick={() => setSelectedChannel(id)}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {currentTemplate && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Preview
                  </label>
                  <div className="border rounded-lg p-4 bg-slate-50 text-sm space-y-2">
                    <p className="font-medium text-slate-800">
                      Subject:{" "}
                      {renderTemplate(currentTemplate.subject, selectedLead)}
                    </p>
                    <hr />
                    <p className="text-slate-600 whitespace-pre-line">
                      {renderTemplate(currentTemplate.body, selectedLead)}
                    </p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="text-sm text-center py-2 rounded-lg bg-green-50 text-green-700">
                  {successMessage}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-800 hover:bg-blue-900 gap-1.5"
              onClick={handleSendFollowUp}
              disabled={sendingFollowUp}
            >
              <Send className="w-4 h-4" />
              {sendingFollowUp ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
