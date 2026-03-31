"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup } from "./actions";
import { useActionState } from "react";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string; success: string }, formData: FormData) => {
      const result = mode === "signup"
        ? await signup(formData)
        : await login(formData);
      return { error: result?.error ?? "", success: (result as any)?.success ?? "" };
    },
    { error: "", success: "" }
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Business Cockpit</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="mail@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            {state.error !== "" && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state.success !== "" && (
              <p className="text-sm text-green-600">{state.success}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "..." : mode === "signup" ? "Account erstellen" : "Anmelden"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Ersten Account erstellen" : "Zurück zum Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
