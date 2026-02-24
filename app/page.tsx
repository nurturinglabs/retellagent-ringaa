import Link from "next/link";
import {
  GraduationCap,
  LayoutDashboard,
  Globe,
  School,
  Zap,
  BarChart3,
  Clock,
  Wrench,
  Phone,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  { icon: Globe, label: "Multilingual" },
  { icon: School, label: "Knows your school" },
  { icon: Zap, label: "Real-time lead capture" },
  { icon: BarChart3, label: "CRM & analytics" },
  { icon: Clock, label: "24/7 availability" },
  { icon: Wrench, label: "Built for schools" },
];

const RINGAA_PHONE =
  process.env.NEXT_PUBLIC_RINGAA_PHONE || "+1 (262) 384-6288";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-blue-900">Ringaa</span>
                <p className="text-[10px] text-slate-400 leading-tight -mt-0.5">
                  Powered by Retell AI & Claude Sonnet 4
                </p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main — split layout */}
      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Copy */}
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-blue-700 tracking-wide uppercase">
                  AI-Powered School Admissions
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
                  Every parent call,{" "}
                  <span className="text-blue-800">answered instantly</span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                  Ringaa is an AI voice agent that handles admission inquiries
                  24/7. It answers questions about fees, seats, and
                  transport — captures every lead automatically — and hands off
                  to your team with full context.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2.5">
                {features.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-700" />
                    {label}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex items-center gap-3 pt-2">
                <Link href="/dashboard">
                  <Button variant="outline" className="gap-1.5">
                    <LayoutDashboard className="w-4 h-4" />
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — Call CTA */}
            <div className="lg:pl-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Voice Agent Active
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    Brookfield International School
                  </span>
                </div>

                {/* Phone call interface */}
                <div className="flex flex-col items-center py-8">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                    <span className="text-4xl">🏫</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Brookfield International School
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 mb-2">
                    Admissions Office
                  </p>

                  <p className="text-3xl font-bold text-blue-600 my-4 tracking-wide">
                    {RINGAA_PHONE}
                  </p>

                  <Button
                    className="w-full max-w-xs gap-2 bg-green-500 hover:bg-green-600"
                    size="lg"
                    asChild
                  >
                    <a href={`tel:${RINGAA_PHONE.replace(/[\s()]/g, "")}`}>
                      <Phone className="w-5 h-5" />
                      Call Now
                    </a>
                  </Button>

                  <div className="flex items-center gap-4 mt-5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Available 24/7
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      AI-powered assistant
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-3">
                    Ask about fees, seats, campus visits, or start an
                    application
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
            <span>
              Powered by{" "}
              <span className="font-medium text-slate-500">
                Retell AI
              </span>{" "}
              &{" "}
              <span className="font-medium text-slate-500">
                Claude Sonnet 4
              </span>
            </span>
            <span>Built by Umesh</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
