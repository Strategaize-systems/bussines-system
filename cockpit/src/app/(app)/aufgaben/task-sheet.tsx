"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskForm } from "./task-form";
import { createTask, updateTask, type Task } from "./actions";
import { useState, useTransition } from "react";

interface TaskSheetProps {
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  task?: Task;
  trigger?: React.ReactNode;
}

export function TaskSheet({ contacts, companies, deals, task, trigger }: TaskSheetProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = task
        ? await updateTask(task.id, formData)
        : await createTask(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(""); }}>
      <SheetTrigger>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Aufgabe erstellen
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          <TaskForm
            task={task}
            contacts={contacts}
            companies={companies}
            deals={deals}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
