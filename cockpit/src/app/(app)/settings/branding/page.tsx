import { Palette } from "lucide-react";
import { getBranding, updateBranding, uploadLogo } from "./actions";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const branding = await getBranding();

  return (
    <main className="px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-sm text-muted-foreground">
          Logo, Farben, Schrift und Footer fuer alle versendeten E-Mails.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
            <Palette className="h-4 w-4 text-violet-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Mail-Branding</p>
            <p className="text-xs text-slate-500">
              Wird auf alle ausgehenden Mails angewendet (Live-Preview im Composing-Studio).
            </p>
          </div>
        </div>

        <BrandingForm
          initial={branding}
          onSave={updateBranding}
          onUploadLogo={uploadLogo}
        />
      </div>
    </main>
  );
}
