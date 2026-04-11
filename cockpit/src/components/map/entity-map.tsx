"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoEntity } from "@/lib/geo/plz-lookup";
import { GERMANY_CENTER, GERMANY_ZOOM } from "@/lib/geo/plz-lookup";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface EntityMapProps {
  entities: GeoEntity[];
  onEntityClick?: (id: string) => void;
  hoveredId?: string | null;
  showHeatmap?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
}

function createMarkerIcon(type?: string, isHovered?: boolean) {
  const colors: Record<string, string> = {
    ideal: "#10b981",
    gut: "#4454b8",
    "möglich": "#f97316",
    ungeeignet: "#ef4444",
    hoch: "#10b981",
    mittel: "#4454b8",
    niedrig: "#f97316",
  };
  const color = colors[type || ""] || "#4454b8";
  const size = isHovered ? 14 : 10;
  const border = isHovered ? 3 : 2;

  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border}px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);transition:all 0.15s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapController({
  center,
  zoom,
}: {
  center?: { lat: number; lng: number };
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom ?? 11, { duration: 0.8 });
    }
  }, [map, center, zoom]);
  return null;
}

function HeatmapLayer({
  entities,
  active,
}: {
  entities: GeoEntity[];
  active: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!active) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    // Dynamically import leaflet.heat
    import("leaflet.heat").then(() => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      const points: [number, number, number][] = entities.map((e) => [
        e.lat,
        e.lng,
        1.0,
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layerRef.current = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
      });
      layerRef.current!.addTo(map);
    });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, entities, active]);

  return null;
}

export function EntityMap({
  entities,
  onEntityClick,
  hoveredId,
  showHeatmap = false,
  center,
  zoom,
  height = "100%",
  className = "",
}: EntityMapProps) {
  const [heatmapActive, setHeatmapActive] = useState(showHeatmap);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={[
          center?.lat ?? GERMANY_CENTER.lat,
          center?.lng ?? GERMANY_CENTER.lng,
        ]}
        zoom={zoom ?? GERMANY_ZOOM}
        className="h-full w-full rounded-xl z-0"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} zoom={zoom} />
        <HeatmapLayer entities={entities} active={heatmapActive} />

        {!heatmapActive &&
          entities.map((entity) => (
            <Marker
              key={entity.id}
              position={[entity.lat, entity.lng]}
              icon={createMarkerIcon(entity.type, hoveredId === entity.id)}
              eventHandlers={{
                click: () => onEntityClick?.(entity.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{entity.label}</div>
                  {entity.sublabel && (
                    <div className="text-slate-500 text-xs">
                      {entity.sublabel}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Heatmap Toggle */}
      <button
        onClick={() => setHeatmapActive(!heatmapActive)}
        className={`absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all ${
          heatmapActive
            ? "bg-[#4454b8] text-white"
            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        {heatmapActive ? "Marker" : "Heatmap"}
      </button>
    </div>
  );
}
