"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ExternalLink, UserRound, Search } from "lucide-react";

interface ClientsSearchWrapperProps {
  clients: Record<string, unknown>[];
}

export function ClientsSearchWrapper({ clients }: ClientsSearchWrapperProps) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${String(c.first_name)} ${String(c.last_name)}`.toLowerCase();
    return name.includes(q);
  });

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Policy</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client: Record<string, unknown>) => (
                    <TableRow key={client.id as string}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10">
                            <UserRound className="h-4 w-4 text-navy" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-navy">
                              {String(client.first_name)} {String(client.last_name)}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {client.policies
                                ? String((client.policies as { carrier: string }).carrier)
                                : "No policy"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {client.policies ? (
                          <div>
                            <p className="text-sm font-medium">
                              {String((client.policies as { carrier: string }).carrier)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {String((client.policies as { policy_number: string }).policy_number)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No policy</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm">{String(client.email)}</p>
                        <p className="text-xs text-muted-foreground">
                          {String(client.phone || "No phone")}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {String(client.city || "")}, {String(client.state || "")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
              <UserRound className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                {search ? "No clients match your search" : "No clients yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {search
                  ? "Try a different search term"
                  : "Add your first client to get started"}
              </p>
              {!search && (
                <Link href="/dashboard/clients/new" className="mt-4">
                  <Button variant="navy">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client & Policy
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
