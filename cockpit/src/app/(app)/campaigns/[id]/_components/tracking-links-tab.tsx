import { Link2, Sparkles } from "lucide-react";

export function TrackingLinksTab() {
  return (
    <div className="rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/30 p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
        <Link2 className="h-5 w-5 text-violet-600" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">
        Tracking-Links kommen mit V6.2 SLC-625
      </h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
        Hier wirst du Tracking-Links anlegen koennen (Token-basierte Redirects
        mit UTM-Parametern), Click-Counts sehen und automatisches
        UTM-Lead-Mapping aktivieren.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-violet-200 text-xs font-medium text-violet-700">
        <Sparkles className="h-3.5 w-3.5" />
        Geplant fuer V6.2 Slice 625
      </div>
      <p className="mt-4 text-xs text-slate-500 max-w-md mx-auto">
        Bis dahin: Manuell Kampagnen ueber das Stammdaten-Feld
        &ldquo;Kampagne&rdquo; in Contacts/Companies/Deals zuordnen.
      </p>
    </div>
  );
}
