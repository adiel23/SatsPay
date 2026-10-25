"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import SendRemittanceSection from "@/components/SendRemittanceSection";

export default function EnviarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <SendRemittanceSection />
      </main>
    </div>
  );
}
