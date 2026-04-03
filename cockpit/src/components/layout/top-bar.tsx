"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { signout } from "@/app/(auth)/login/actions";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-sm px-6 lg:px-8">
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted outline-none"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">BS</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <form action={signout}>
            <button type="submit" className="w-full">
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
