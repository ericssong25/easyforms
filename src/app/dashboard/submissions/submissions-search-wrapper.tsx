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
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { FileCheck, Search } from "lucide-react";
import { SubmissionsClient } from "./submissions-client";

interface SubmissionsSearchWrapperProps {
  submissions: Record<string, unknown>[];
}

export function SubmissionsSearchWrapper({
  submissions,
}: SubmissionsSearchWrapperProps) {
  const [search, setSearch] = useState("");

  const filtered = submissions.filter((sub) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${String((sub.clients as { first_name: string }).first_name)} ${String((sub.clients as { last_name: string }).last_name)}`.toLowerCase();
    return name.includes(q);
  });

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search submissions by client name..."
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
                    <TableHead className="hidden sm:table-cell">Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                    <TableHead className="hidden md:table-cell">Signed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub: Record<string, unknown>) => {
                    const clientData = sub.clients as {
                      first_name: string;
                      last_name: string;
                      email: string;
                    };
                    const templateData = sub.templates as { name: string };
                    const subsId = String(sub.id);

                    return (
                      <TableRow key={subsId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-navy">
                              {clientData.first_name} {clientData.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {templateData.name}
                            </p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {clientData.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {templateData.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(
                              sub.status as
                                | "draft"
                                | "sent"
                                | "opened"
                                | "signed"
                            )}
                          >
                            {String(sub.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {new Date(
                            String(sub.created_at)
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {sub.signed_at
                            ? new Date(
                                String(sub.signed_at)
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <SubmissionsClient
                              submissionId={subsId}
                              signedPdfUrl={String(sub.signed_pdf_url || "")}
                              clientEmail={clientData.email}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
              <FileCheck className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                {search ? "No submissions match your search" : "No submissions yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
                {search
                  ? "Try a different search term"
                  : "Send a form to a client to get started"}
              </p>
              {!search && (
                <Link href="/dashboard/clients" className="mt-4">
                  <Button variant="navy">View Clients</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
