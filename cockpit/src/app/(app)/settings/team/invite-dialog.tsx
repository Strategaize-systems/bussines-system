"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { inviteMember } from "@/lib/team/actions";
import type { Role } from "@/lib/auth/types";

interface Props {
  callerRole: Role;
  callerTeamId: string | null;
  teams: Array<{ id: string; name: string }>;
}

export function InviteDialog({ callerRole, callerTeamId, teams }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [teamId, setTeamId] = useState<string>(callerTeamId ?? teams[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAdmin = callerRole === "admin";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await inviteMember({
        email: email.trim(),
        role,
        team_id: teamId,
        display_name: displayName.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(`Einladung gesendet an ${email.trim()}.`);
        setEmail("");
        setDisplayName("");
        setRole("member");
        // Dialog schliesst nach kurzem Erfolgs-Hinweis, damit User sieht dass
        // die Mail raus ist.
        setTimeout(() => {
          setOpen(false);
          setSuccess(null);
        }, 1200);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Mitglied einladen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mitglied einladen</DialogTitle>
          <DialogDescription>
            Der eingeladene User erhaelt eine E-Mail mit Set-Password-Link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="invite-email"
              className="text-sm font-medium text-slate-700"
            >
              E-Mail
            </label>
            <input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              placeholder="neu@strategaize.dev"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="invite-display-name"
              className="text-sm font-medium text-slate-700"
            >
              Anzeigename (optional)
            </label>
            <input
              id="invite-display-name"
              type="text"
              autoComplete="off"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              placeholder="Max Mustermann"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Rolle</label>
            <Select
              value={role}
              onValueChange={(v: string | null) => {
                if (v) setRole(v as Role);
              }}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {role === "admin"
                    ? "Admin"
                    : role === "teamlead"
                      ? "Teamlead"
                      : "Member"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="teamlead">Teamlead</SelectItem>
                {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Team</label>
            <Select
              value={teamId}
              onValueChange={(v: string | null) => {
                if (v) setTeamId(v);
              }}
              disabled={isPending || !isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {teams.find((t) => t.id === teamId)?.name ?? teamId}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAdmin && (
              <p className="text-xs text-slate-500">
                Teamleads koennen nur das eigene Team einladen.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending}>
                  Abbrechen
                </Button>
              }
            />
            <Button type="submit" disabled={isPending || !email || !teamId}>
              {isPending ? "Sende..." : "Einladung senden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
