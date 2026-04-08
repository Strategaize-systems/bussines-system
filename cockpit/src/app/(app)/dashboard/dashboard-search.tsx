"use client";

import { FilterBar } from "@/components/ui/filter-bar";
import { useState } from "react";

export function DashboardSearch() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <FilterBar
      searchPlaceholder="Dashboard durchsuchen oder KI-Frage stellen..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      showVoice
      showAI
    />
  );
}
