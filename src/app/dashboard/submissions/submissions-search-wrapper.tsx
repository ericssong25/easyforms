"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
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
import { cn } from "@/lib/utils";
import {
  FileCheck,
  Search,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { SubmissionsClient } from "./submissions-client";
import {
  querySubmissionsAction,
  type SubmissionRow,
  type SubmissionsQueryResult,
  type SubmissionStatusFilter,
} from "@/lib/actions/submissions";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 500;

const STATUS_OPTIONS: { value: SubmissionStatusFilter; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "opened", label: "Opened" },
  { value: "signed", label: "Signed" },
];

type StatusCounts = Record<SubmissionStatusFilter, number>;

interface AppliedQuery {
  search: string;
  statuses: SubmissionStatusFilter[];
}

interface SubmissionsSearchWrapperProps {
  initialRows: SubmissionRow[];
  initialTotalCount: number;
  initialHasMore: boolean;
  initialStatusCounts: StatusCounts;
}

export function SubmissionsSearchWrapper({
  initialRows,
  initialTotalCount,
  initialHasMore,
  initialStatusCounts,
}: SubmissionsSearchWrapperProps) {
  // ---- state ----
  const [searchInput, setSearchInput] = React.useState("");
  const [applied, setApplied] = React.useState<AppliedQuery>({
    search: "",
    statuses: [],
  });

  // Selected status filter (multi-select, auto-applied on toggle).
  const [pendingStatuses, setPendingStatuses] =
    React.useState<SubmissionStatusFilter[]>([]);

  // Loaded pages accumulator.
  const [rows, setRows] = React.useState<SubmissionRow[]>(initialRows);
  const [totalCount, setTotalCount] = React.useState<number>(initialTotalCount);
  const [hasMore, setHasMore] = React.useState<boolean>(initialHasMore);
  const [statusCounts, setStatusCounts] =
    React.useState<StatusCounts>(initialStatusCounts);

  // Loading flags.
  const [searching, setSearching] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const queryTokenRef = React.useRef(0);

  // ---- runQuery ----
  const runQuery = React.useCallback(
    async (q: AppliedQuery, mode: "search" | "more") => {
      const token = ++queryTokenRef.current;
      if (mode === "search") setSearching(true);
      else setLoadingMore(true);

      const from = mode === "search" ? 0 : rows.length;
      const to = from + PAGE_SIZE - 1;

      try {
        const result: SubmissionsQueryResult = await querySubmissionsAction({
          search: q.search || undefined,
          statuses: q.statuses,
          from,
          to,
        });

        if (token !== queryTokenRef.current) return;

        if (mode === "search") {
          setRows(result.rows);
        } else {
          setRows((prev) => [...prev, ...result.rows]);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setStatusCounts(result.statusCounts);
        setApplied(q);
      } catch (err) {
        console.error("[submissions-search] query failed", err);
      } finally {
        if (token === queryTokenRef.current) {
          if (mode === "search") setSearching(false);
          else setLoadingMore(false);
        }
      }
    },
    [rows.length]
  );

  // ---- debounced search ----
  React.useEffect(() => {
    if (searchInput === applied.search) return;
    const handle = window.setTimeout(() => {
      void runQuery(
        {
          search: searchInput,
          statuses: applied.statuses,
        },
        "search"
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // We intentionally only depend on searchInput. Toggling statuses
    // re-runs the query immediately (no debounce) via toggleStatus().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ---- status toggles (auto-apply) ----
  const toggleStatus = (s: SubmissionStatusFilter) => {
    setPendingStatuses((prev) => {
      const next = prev.includes(s)
        ? prev.filter((v) => v !== s)
        : [...prev, s];
      // Auto-apply on toggle: status chips are simple enough that the
      // user expects instant feedback. Search is separate (debounced).
      void runQuery(
        { search: applied.search, statuses: next },
        "search"
      );
      return next;
    });
  };

  const clearStatuses = () => {
    if (pendingStatuses.length === 0) return;
    setPendingStatuses([]);
    void runQuery({ search: applied.search, statuses: [] }, "search");
  };

  const clearSearch = () => {
    setSearchInput("");
    void runQuery(
      { search: "", statuses: applied.statuses },
      "search"
    );
  };

  const loadMore = () => {
    void runQuery(applied, "more");
  };

  // ---- derived ----
  const isEmpty = !searching && rows.length === 0;
  const showNoResultsCopy =
    isEmpty && (applied.search.length > 0 || applied.statuses.length > 0);
  const hasFilter = searchInput.length > 0 || pendingStatuses.length > 0;
  const totalAcrossStatuses = STATUS_OPTIONS.reduce(
    (acc, s) => acc + (statusCounts[s.value] ?? 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Form Submissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Track all form submissions and their status
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter submissions by status"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1 shadow-sm"
        >
          {STATUS_OPTIONS.map((f) => {
            const active = pendingStatuses.includes(f.value);
            const count = statusCounts[f.value] ?? 0;
            return (
              <button
                key={f.value}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleStatus(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {pendingStatuses.length > 0 && (
            <button
              type="button"
              onClick={clearStatuses}
              className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Clear status filter"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by client name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9 focus-visible:ring-primary"
            aria-label="Search submissions by client name"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Template
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Sent
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Signed
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((sub, idx) => {
                    return (
                      <motion.tr
                        key={sub.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.25,
                          ease: "easeOut",
                          delay: Math.min(idx, 12) * 0.025,
                        }}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {sub.clients.first_name} {sub.clients.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {sub.templates.name}
                            </p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {sub.clients.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {sub.templates.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {sub.signed_at
                            ? new Date(sub.signed_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <SubmissionsClient
                              submissionId={sub.id}
                              signedPdfUrl={sub.fresh_signed_pdf_url ?? ""}
                              clientEmail={sub.clients.email}
                            />
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : searching ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading submissions...
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <FileCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {showNoResultsCopy
                  ? "No submissions match your filters"
                  : "No submissions yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {showNoResultsCopy
                  ? "Try a different name or status"
                  : "Send a form to a client to get started"}
              </p>
              {showNoResultsCopy ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5"
                  onClick={() => {
                    setSearchInput("");
                    setPendingStatuses([]);
                    void runQuery(
                      { search: "", statuses: [] },
                      "search"
                    );
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link href="/dashboard/clients" className="mt-5">
                  <Button variant="navy">View Clients</Button>
                </Link>
              )}
            </div>
          )}

          {/* Footer / pagination */}
          {rows.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
              <div>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {rows.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalCount}
                </span>{" "}
                {totalCount === 1 ? "submission" : "submissions"}
                {hasFilter && totalAcrossStatuses > 0 && (
                  <span className="ml-2 text-muted-foreground/80">
                    · matching {totalAcrossStatuses} in current filter
                  </span>
                )}
              </div>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2 rounded-xl"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Ver más
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
