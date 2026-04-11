"use client";

import dynamic from "next/dynamic";
import type { GeoEntity } from "@/lib/geo/plz-lookup";

const EntityMapInner = dynamic(
  () => import("./entity-map").then((mod) => mod.EntityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-xl bg-gradient-to-br from-blue-50/50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[#4454b8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">
            Karte wird geladen...
          </p>
        </div>
      </div>
    ),
  }
);

interface EntityMapDynamicProps {
  entities: GeoEntity[];
  onEntityClick?: (id: string) => void;
  hoveredId?: string | null;
  showHeatmap?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
}

export function EntityMapDynamic(props: EntityMapDynamicProps) {
  return <EntityMapInner {...props} />;
}
