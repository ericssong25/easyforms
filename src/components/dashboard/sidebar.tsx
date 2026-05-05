"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  ShieldCheck,
  LogOut,
  FileTextIcon,
  X,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clients & Policies",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Form Templates",
    href: "/dashboard/forms",
    icon: FileText,
  },
  {
    label: "Submissions",
    href: "/dashboard/submissions",
    icon: FileCheck,
  },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-3">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-blue text-white"
                : "text-white/70 hover:bg-slate-blue/40 hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar() {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="hidden w-64 flex-col border-r bg-navy text-white lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-blue/30 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-blue">
          <FileTextIcon className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Easy Forms</span>
      </div>

      <ScrollArea className="flex-1 py-4">
        <NavLinks />
      </ScrollArea>

      <div className="border-t border-slate-blue/30 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-blue/20 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-white/70">Encrypted connection</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2 text-white/70 hover:bg-slate-blue/40 hover:text-white"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

export function MobileNavSheet() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-navy p-0 text-white">
        <div className="flex h-14 items-center justify-between border-b border-slate-blue/30 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-blue">
              <FileTextIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Easy Forms
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 py-4">
          <div onClick={() => setOpen(false)}>
            <NavLinks />
          </div>
        </ScrollArea>
        <div className="border-t border-slate-blue/30 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-blue/20 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-white/70">Encrypted connection</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 text-white/70 hover:bg-slate-blue/40 hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
