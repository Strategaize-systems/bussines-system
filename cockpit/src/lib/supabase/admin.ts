import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let externalHost = "";
  try {
    externalHost = new URL(appUrl).host;
  } catch {
    // Fallback if URL parsing fails
  }

  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Forwarded-Host": externalHost,
          "X-Forwarded-Proto": "https",
        },
      },
    }
  );
}
