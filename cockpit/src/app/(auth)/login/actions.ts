"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // SLC-702: rollen-aware Landing-Redirect. Member darf /dashboard nicht
  // sehen (DEC-191) — direkt zu /mein-tag schicken, sonst zeigt URL-Bar
  // kurz /dashboard waehrend Middleware zu /mein-tag redirected (Server-
  // Action + Middleware-Redirect-Interaktion in Next.js 16).
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profile?.role === "member") {
      redirect("/mein-tag");
    }
  }

  redirect("/dashboard");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
