"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink } from "lucide-react";
import { changeRole, deleteProfile } from "@/lib/team/actions";
import type { Role } from "@/lib/auth/types";
import type { TeamMemberRow } from "./page";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  teamlead: "Teamlead",
  member: "Member",
};

const ROLE_TONE: Record<Role, string> = {
  admin: "bg-blue-100 text-blue-800",
  teamlead: "bg-purple-100 text-purple-800",
  member: "bg-slate-100 text-slate-700",
};

interface Props {
  rows: TeamMemberRow[];
  callerIsAdmin: boolean;
  callerUserId: string;
}

export function TeamMembersTable({ rows, callerIsAdmin, callerUserId }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white p-10 text-center text-sm text-slate-500">
        Noch keine Mitglieder. Klicke oben auf{" "}
        <span className="font-medium text-slate-700">Mitglied einladen</span>,
        um zu starten.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitglied</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead className="text-right">Offene Deals</TableHead>
              <TableHead className="text-right">Offene Aufgaben</TableHead>
              <TableHead>Letzter Login</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <MemberRow
                key={row.user_id}
                row={row}
                callerIsAdmin={callerIsAdmin}
                isSelf={row.user_id === callerUserId}
                onError={setActionError}
                onSuccess={() => setActionError(null)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MemberRow({
  row,
  callerIsAdmin,
  isSelf,
  onError,
  onSuccess,
}: {
  row: TeamMemberRow;
  callerIsAdmin: boolean;
  isSelf: boolean;
  onError: (msg: string) => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRoleChange(newRole: Role) {
    if (newRole === row.role) return;
    startTransition(async () => {
      const result = await changeRole({
        user_id: row.user_id,
        new_role: newRole,
      });
      if (!result.ok) {
        onError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProfile({ user_id: row.user_id });
      if (!result.ok) {
        onError(result.error);
        setConfirmOpen(false);
      } else {
        onSuccess();
        setConfirmOpen(false);
      }
    });
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>
        <div className="font-medium text-slate-900">
          {row.display_name ?? row.email ?? row.user_id}
        </div>
      </TableCell>
      <TableCell>
        {callerIsAdmin && !isSelf ? (
          <Select
            value={row.role}
            onValueChange={(v: string | null) => {
              if (v) handleRoleChange(v as Role);
            }}
            disabled={isPending}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teamlead">Teamlead</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge className={ROLE_TONE[row.role]}>{ROLE_LABEL[row.role]}</Badge>
        )}
      </TableCell>
      <TableCell className="text-slate-600">{row.email ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{row.open_deals}</TableCell>
      <TableCell className="text-right tabular-nums">
        {row.open_activities}
      </TableCell>
      <TableCell className="text-slate-600">
        {row.last_sign_in_at
          ? new Date(row.last_sign_in_at).toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="Drilldown kommt mit SLC-706"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {callerIsAdmin && !isSelf && (
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label="Profil loeschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Profil loeschen?</DialogTitle>
                  <DialogDescription>
                    Loescht{" "}
                    <span className="font-medium">
                      {row.display_name ?? row.email ?? row.user_id}
                    </span>{" "}
                    permanent aus Auth und Profiles. Owner-Records muessen vorher
                    via Bulk-Reassign auf einen anderen User uebertragen
                    werden.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Abbrechen</Button>}
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    {isPending ? "Loesche..." : "Profil loeschen"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
