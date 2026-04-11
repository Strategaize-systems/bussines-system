# SLC-326 — PLZ-Kartensuche mit Heatmap

## Architecture

### Summary
Interaktive Deutschlandkarte auf Kontakte-, Firmen- und Multiplikatoren-Seiten. PLZ-Eingabe zoomt auf Region und zeigt Eintraege im Umkreis. Heatmap visualisiert Aktivitaetsdichte. Client-seitige Implementierung ohne Server-Aenderungen.

### Technologie-Stack
- **Karte**: Leaflet + react-leaflet (Open Source, kostenlos)
- **Tiles**: OpenStreetMap (tile.openstreetmap.org)
- **Heatmap**: leaflet.heat Plugin
- **Geocoding**: Statische PLZ→Koordinaten JSON-Datei (~8.000 Eintraege, ~200KB)

### Begruendung
Siehe DEC-027 (Leaflet statt Mapbox) und DEC-028 (statische PLZ-Tabelle statt API).

---

## Datenfluss

### Bestehendes Datenmodell
- `companies.address_zip` — PLZ-Feld (TEXT), bereits vorhanden
- `companies.address_city` — Stadt, bereits vorhanden
- `contacts` — KEINE eigenen Adressfelder, erben von Company via `company_id` FK
- `contacts.region` — Freitext-Feld, manuell gesetzt

### Geo-Aufloesung
```
PLZ (string) → plz-coordinates.json Lookup → { lat, lng } → Leaflet Marker
```

Firmen haben direkt `address_zip`. Kontakte erhalten Koordinaten ueber ihre verlinkte Firma.
Multiplikatoren sind Kontakte mit `is_multiplier = true` — gleiche Logik.

### Entities ohne PLZ
Kontakte/Firmen ohne PLZ werden auf der Karte nicht angezeigt, aber in der Liste weiterhin sichtbar (mit Hinweis "Kein Standort").

---

## Komponenten-Architektur

### 1. Statische Daten
**`/cockpit/src/lib/geo/plz-coordinates.json`**
```json
{
  "10115": { "lat": 52.532, "lng": 13.383, "city": "Berlin" },
  "20095": { "lat": 53.551, "lng": 9.993, "city": "Hamburg" },
  ...
}
```
- ~8.000 Eintraege, ~200KB
- Quelle: OpenGeodata.de oder aehnliche freie PLZ-Datenbank
- Einmalig generiert, selten aktualisiert

### 2. Geo-Utility
**`/cockpit/src/lib/geo/plz-lookup.ts`**
```typescript
export function getCoordinatesForPlz(plz: string): { lat: number; lng: number } | null
export function getEntitiesInRadius(entities: GeoEntity[], center: { lat: number; lng: number }, radiusKm: number): GeoEntity[]
export function calculateDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number  // Haversine
```

### 3. Karten-Komponente (wiederverwendbar)
**`/cockpit/src/components/map/entity-map.tsx`**
```typescript
interface EntityMapProps {
  entities: GeoEntity[];          // Items mit lat/lng
  onEntityClick?: (id: string) => void;
  showHeatmap?: boolean;          // Heatmap-Layer toggle
  searchPlz?: string;             // Zoom auf PLZ
  radiusKm?: number;              // Umkreis-Filter (default 50)
  height?: string;                // CSS height
}

interface GeoEntity {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  type?: string;
}
```

### 4. PLZ-Suchfeld
**`/cockpit/src/components/map/plz-search.tsx`**
```typescript
interface PlzSearchProps {
  value: string;
  onChange: (plz: string) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}
```
- PLZ-Eingabefeld (5 Zeichen)
- Radius-Dropdown (10, 25, 50, 100 km)
- Validierung: Nur Ziffern, max 5 Stellen

---

## Seiten-Integration

### Layout pro Seite
```
+-------------------------------------------+
| FilterBar (bestehend + PLZ-Suche)         |
+-------------------------------------------+
| [Karte (8 cols)]  | [Liste (4 cols)]      |
|                   |                        |
| Leaflet Map       | Gefilterte Eintraege   |
| mit Markern +     | mit Entfernungsangabe  |
| Heatmap-Toggle    |                        |
+-------------------------------------------+
```

Die Karte ersetzt NICHT die bestehende Card-Ansicht — sie wird als zusaetzlicher View-Mode integriert (Tab oder Toggle: Grid | Liste | Karte).

### Betroffene Seiten
1. **Firmen** (`companies-client.tsx`) — Primaer, hat direkt PLZ
2. **Kontakte** (`contacts-client.tsx`) — Ueber Company-FK
3. **Multiplikatoren** (`multiplikatoren-client.tsx`) — Ueber Company-FK

### Daten-Anreicherung
Die Page-Level Server Components laden bereits alle Entities. Die Geo-Anreicherung (PLZ → lat/lng) passiert client-seitig per `useMemo`:

```typescript
const geoEntities = useMemo(() => 
  companies
    .map(c => {
      const coords = getCoordinatesForPlz(c.address_zip);
      if (!coords) return null;
      return { id: c.id, lat: coords.lat, lng: coords.lng, label: c.name, ... };
    })
    .filter(Boolean),
  [companies]
);
```

Fuer Kontakte: Company-PLZ wird ueber den geladenen Company-Join aufgeloest.

---

## Heatmap

### Datenquelle
Heatmap-Punkte = alle Entities mit gueltigem PLZ, gewichtet nach:
- Anzahl Deals (fuer Firmen)
- Trust-Level (fuer Multiplikatoren)
- Einfach: gleiche Gewichtung (1 Punkt pro Entity)

### Leaflet.heat Integration
```typescript
import L from "leaflet";
import "leaflet.heat";

// Heatmap-Layer
const heatLayer = L.heatLayer(
  geoEntities.map(e => [e.lat, e.lng, 1.0]),  // [lat, lng, intensity]
  { radius: 25, blur: 15, maxZoom: 10 }
);
```

### Toggle
Heatmap ist ein optionaler Layer, per Button ein-/ausschaltbar. Default: aus (Marker sichtbar).

---

## Dependencies (neu)

| Package | Version | Zweck | Groesse |
|---------|---------|-------|---------|
| `leaflet` | ^1.9 | Karten-Engine | ~40KB gzip |
| `react-leaflet` | ^5.0 | React-Wrapper | ~15KB gzip |
| `leaflet.heat` | ^0.2 | Heatmap-Plugin | ~5KB gzip |

Keine API-Keys noetig. Keine Server-Abhaengigkeiten.

**Leaflet CSS**: Muss in `layout.tsx` oder Komponente importiert werden:
```typescript
import "leaflet/dist/leaflet.css";
```

**SSR-Handling**: Leaflet benoetigt `window` — Karten-Komponente muss mit `dynamic(() => import(...), { ssr: false })` geladen werden.

---

## Keine DB-Migration noetig

Bestehendes `address_zip` Feld reicht aus. Keine neuen Tabellen, keine Schema-Aenderungen. PLZ-Koordinaten werden client-seitig aufgeloest.

---

## Offene Punkte

1. **PLZ-Datenquelle**: Konkrete JSON-Datei muss generiert/beschafft werden. Freie Quellen: OpenGeodata.de, GeoNames.org, Bundesnetzagentur.
2. **Kontakte ohne Firma**: Kontakte ohne `company_id` haben keine PLZ — werden auf Karte nicht angezeigt.
3. **Oesterreich/Schweiz PLZ**: Aktuell nur Deutschland geplant. DACH-Erweiterung spaeter moeglich (separate PLZ-Dateien).
4. **Default-Kartenausschnitt**: Deutschland-Zentrum (lat: 51.1657, lng: 10.4515, zoom: 6).

---

## Implementierungs-Reihenfolge

1. Dependencies installieren (leaflet, react-leaflet, leaflet.heat)
2. PLZ-Koordinaten-JSON beschaffen/generieren
3. Geo-Utility erstellen (plz-lookup.ts)
4. EntityMap-Komponente bauen (Marker + Heatmap)
5. PlzSearch-Komponente bauen
6. Firmen-Seite integrieren (hat direkt PLZ)
7. Kontakte + Multiplikatoren integrieren (ueber Company-FK)
8. View-Toggle erweitern (Grid | Liste | Karte)
