import { getProfile } from "@/lib/auth/get-profile";
import type { ReactNode } from "react";
import { SettingsLayoutClient } from "./settings-layout-client";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  // SLC-711 DEC-196b: Settings-Sub-Sidebar wird server-side rollen-gefiltert.
  // Role wird an Client-Component fuer usePathname-Active-Highlight uebergeben.
  const profile = await getProfile();

  return (
    <SettingsLayoutClient role={profile.role}>{children}</SettingsLayoutClient>
  );
}
