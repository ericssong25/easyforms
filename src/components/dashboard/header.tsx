"use client";

import { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MobileNavSheet } from "@/components/dashboard/sidebar";
import type { Agent } from "@/lib/types";

interface DashboardHeaderProps {
  user: User;
  agent: Agent | null;
}

export function DashboardHeader({ user, agent }: DashboardHeaderProps) {
  const supabase = createClient();

  const initials = agent?.full_name
    ? agent.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "A";

  const displayName = agent?.full_name ?? user.email ?? "Agent";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNavSheet />
        <h2 className="hidden text-sm font-medium text-muted-foreground sm:block">
          {agent?.agency_name ? `${agent.agency_name} — ` : ""}
          Agent Portal
        </h2>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 gap-2 rounded-xl">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-navy text-xs text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {agent?.npn && (
                <p className="text-xs leading-none text-muted-foreground">
                  NPN: {agent.npn}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
