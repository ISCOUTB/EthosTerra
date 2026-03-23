"use client";
import React from "react";
import TabContent from "@/components/charts/datatabs/TabContent";

export default function StatisticsPage() {
  return (
    <div className="flex h-screen bg-[#0f1417] text-[#ffffff] font-archivo overflow-hidden pl-20 lg:pl-24">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto h-[80vh]">
          <TabContent />
        </div>
      </div>
    </div>
  );
}
