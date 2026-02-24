"use client";

import { Phone, Clock, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RINGAA_PHONE = process.env.NEXT_PUBLIC_RINGAA_PHONE || "+1 (262) 384-6288";

export function CallWidget() {
  return (
    <Card className="p-6 border-2 border-blue-500">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <Phone className="w-8 h-8 text-blue-600" />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Call Ringaa
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          Brookfield International School
        </p>

        <p className="text-3xl font-bold text-blue-600 mb-4 tracking-wide">
          {RINGAA_PHONE}
        </p>

        <Button
          className="w-full gap-2 bg-green-500 hover:bg-green-600"
          size="lg"
          asChild
        >
          <a href={`tel:${RINGAA_PHONE.replace(/\s/g, "")}`}>
            <Phone className="w-5 h-5" />
            Call Now
          </a>
        </Button>

        <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Available 24/7
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            AI-powered
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Estimated call duration: 2-5 minutes
        </p>
      </div>
    </Card>
  );
}
