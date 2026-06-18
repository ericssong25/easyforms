"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Plus,
  ArrowUpRight,
  UserRound,
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  queryClientsAction,
  type ClientRow,
  type ClientsQueryResult,
} from "@/lib/actions/clients";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 500;

type HasPolicyValue = "with" | "without";

interface ClientsSearchWrapperProps {
  initialRows: ClientRow[];
  initialTotalCount: number;
  initialHasMore: boolean;
  initialCarriers: string[];
  initialStates: string[];
}

interface AppliedQuery {
  search: string;
  carriers: string[];
  states: string[];
  hasPolicy: HasPolicyValue[];
}

export function ClientsSearchWrapper({
  initialRows,
  initialTotalCount,
  initialHasMore,
  initialCarriers,
  initialStates,
}: ClientsSearchWrapperProps) {
  // ---- state ----
  const [searchInput, setSearchInput] = React.useState("");
  const [applied, setApplied] = React.useState<AppliedQuery>({
    search: "",
    carriers: [],
    states: [],
    hasPolicy: [],
  });

  // Pending filter selections (not yet applied).
  const [pendingCarriers, setPendingCarriers] = React.useState<string[]>([]);
  const [pendingStates, setPendingStates] = React.useState<string[]>([]);
  const [pendingHasPolicy, setPendingHasPolicy] = React.useState<HasPolicyValue[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Loaded pages accumulator.
  const [rows, setRows] = React.useState<ClientRow[]>(initialRows);
  const [totalCount, setTotalCount] = React.useState<number>(initialTotalCount);
  const [hasMore, setHasMore] = React.useState<boolean>(initialHasMore);

  // Per-query token to discard stale responses.
  const queryTokenRef = React.useRef(0);
  // Loading flags: "search" = first page for a new query, "more" = appending.
  const [searching, setSearching] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Facets (carrier / state options). The server returns the full set for
  // the agent's data regardless of current filters — that matches the
  // spec ("from the carriers actually present in this agent's policies").
  const [carrierOptions, setCarrierOptions] = React.useState<string[]>(initialCarriers);
  const [stateOptions, setStateOptions] = React.useState<string[]>(initialStates);

  // ---- debounced search ----
  React.useEffect(() => {
    if (searchInput === applied.search) return;
    const handle = window.setTimeout(() => {
      void runQuery(
        {
          search: searchInput,
          carriers: applied.carriers,
          states: applied.states,
          hasPolicy: applied.hasPolicy,
        },
        "search"
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // We intentionally don't depend on `applied` — that path is handled by
    // the explicit "Aplicar filtros" button. Mixing them would cause
    // confusing double-queries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ---- query runner ----
  const runQuery = React.useCallback(
    async (q: AppliedQuery, mode: "search" | "more") => {
      const token = ++queryTokenRef.current;
      if (mode === "search") setSearching(true);
      else setLoadingMore(true);

      const from = mode === "search" ? 0 : rows.length;
      const to = from + PAGE_SIZE - 1;

      try {
        const result: ClientsQueryResult = await queryClientsAction({
          search: q.search || undefined,
          carriers: q.carriers,
          states: q.states,
          hasPolicy: q.hasPolicy,
          from,
          to,
        });

        if (token !== queryTokenRef.current) return; // stale

        if (mode === "search") {
          setRows(result.rows);
        } else {
          setRows((prev) => [...prev, ...result.rows]);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);

        // Refresh facets in case the user added their first client etc.
        setCarrierOptions(result.facets.carriers);
        setStateOptions(result.facets.states);

        setApplied(q);
      } catch (err) {
        console.error("[clients-search] query failed", err);
      } finally {
        if (token === queryTokenRef.current) {
          if (mode === "search") setSearching(false);
          else setLoadingMore(false);
        }
      }
    },
    [rows.length]
  );

  const applyFilters = () => {
    void runQuery(
      {
        search: searchInput,
        carriers: pendingCarriers,
        states: pendingStates,
        hasPolicy: pendingHasPolicy,
      },
      "search"
    );
  };

  const clearFilters = () => {
    setPendingCarriers([]);
    setPendingStates([]);
    setPendingHasPolicy([]);
    void runQuery(
      {
        search: searchInput,
        carriers: [],
        states: [],
        hasPolicy: [],
      },
      "search"
    );
  };

  const clearSearch = () => {
    setSearchInput("");
    // Re-run with the current applied filters but empty search.
    void runQuery(
      {
        search: "",
        carriers: applied.carriers,
        states: applied.states,
        hasPolicy: applied.hasPolicy,
      },
      "search"
    );
  };

  const loadMore = () => {
    void runQuery(applied, "more");
  };

  // ---- derived ----
  const pendingFilterCount =
    pendingCarriers.length + pendingStates.length + pendingHasPolicy.length;
  const appliedFilterCount =
    applied.carriers.length + applied.states.length + applied.hasPolicy.length;
  const pendingChanged =
    pendingCarriers.length !== applied.carriers.length ||
    pendingStates.length !== applied.states.length ||
    pendingHasPolicy.length !== applied.hasPolicy.length ||
    pendingCarriers.some((v) => !applied.carriers.includes(v)) ||
    pendingStates.some((v) => !applied.states.includes(v)) ||
    pendingHasPolicy.some((v) => !applied.hasPolicy.includes(v));

  const isEmpty = !searching && rows.length === 0;
  const showNoResultsCopy =
    isEmpty && (applied.search.length > 0 || appliedFilterCount > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: 0.08 }}
      className="space-y-4"
    >
      {/* Search + filter trigger */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search clients by name"
            className="h-10 rounded-xl border-input pl-9 pr-9 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40"
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

        <Button
          variant="outline"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="clients-filters-panel"
          className="h-10 gap-2 rounded-xl border-input px-3 sm:ml-auto"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
          {appliedFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {appliedFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* Filter panel */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            id="clients-filters-panel"
            key="filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <Card className="border-border">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterField label="Carrier">
                    <MultiSelect
                      options={carrierOptions.map((c) => ({ value: c, label: c }))}
                      value={pendingCarriers}
                      onChange={setPendingCarriers}
                      placeholder="Todos los carriers"
                      emptyText="Aún no hay carriers"
                    />
                  </FilterField>
                  <FilterField label="Estado">
                    <MultiSelect
                      options={stateOptions.map((s) => ({ value: s, label: s }))}
                      value={pendingStates}
                      onChange={setPendingStates}
                      placeholder="Todos los estados"
                      emptyText="Aún no hay estados"
                    />
                  </FilterField>
                  <FilterField label="Póliza">
                    <MultiSelect
                      options={[
                        { value: "with", label: "Con póliza" },
                        { value: "without", label: "Sin póliza" },
                      ]}
                      value={pendingHasPolicy}
                      onChange={(v) =>
                        setPendingHasPolicy(v as HasPolicyValue[])
                      }
                      placeholder="Cualquiera"
                      emptyText="—"
                      maxChips={2}
                    />
                  </FilterField>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground">
                    {pendingFilterCount === 0
                      ? "Sin filtros pendientes"
                      : `${pendingFilterCount} filtro${pendingFilterCount === 1 ? "" : "s"} pendiente${pendingFilterCount === 1 ? "" : "s"} de aplicar`}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      disabled={appliedFilterCount === 0 && pendingFilterCount === 0}
                    >
                      Limpiar
                    </Button>
                    <Button
                      variant="navy"
                      size="sm"
                      onClick={applyFilters}
                      disabled={!pendingChanged}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active-filter summary chips */}
      {(applied.search || appliedFilterCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {applied.search && (
            <SummaryChip
              label={`Búsqueda: "${applied.search}"`}
              onRemove={() => {
                setSearchInput("");
                void runQuery(
                  {
                    search: "",
                    carriers: applied.carriers,
                    states: applied.states,
                    hasPolicy: applied.hasPolicy,
                  },
                  "search"
                );
              }}
            />
          )}
          {applied.carriers.map((c) => (
            <SummaryChip
              key={`c-${c}`}
              label={`Carrier: ${c}`}
              onRemove={() => {
                const next = applied.carriers.filter((v) => v !== c);
                setPendingCarriers(next);
                void runQuery(
                  {
                    search: applied.search,
                    carriers: next,
                    states: applied.states,
                    hasPolicy: applied.hasPolicy,
                  },
                  "search"
                );
              }}
            />
          ))}
          {applied.states.map((s) => (
            <SummaryChip
              key={`s-${s}`}
              label={`Estado: ${s}`}
              onRemove={() => {
                const next = applied.states.filter((v) => v !== s);
                setPendingStates(next);
                void runQuery(
                  {
                    search: applied.search,
                    carriers: applied.carriers,
                    states: next,
                    hasPolicy: applied.hasPolicy,
                  },
                  "search"
                );
              }}
            />
          ))}
          {applied.hasPolicy.map((h) => (
            <SummaryChip
              key={`h-${h}`}
              label={h === "with" ? "Con póliza" : "Sin póliza"}
              onRemove={() => {
                const next = applied.hasPolicy.filter((v) => v !== h);
                setPendingHasPolicy(next);
                void runQuery(
                  {
                    search: applied.search,
                    carriers: applied.carriers,
                    states: applied.states,
                    hasPolicy: next,
                  },
                  "search"
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden border-border">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-11 pl-4 sm:pl-6">Client</TableHead>
                  <TableHead className="hidden h-11 sm:table-cell">Policy</TableHead>
                  <TableHead className="hidden h-11 md:table-cell">Contact</TableHead>
                  <TableHead className="hidden h-11 lg:table-cell">Location</TableHead>
                  <TableHead className="h-11 pr-4 text-right sm:pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client, idx) => {
                  const policy = client.policies ?? null;
                  return (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        ease: EASE,
                        delay: Math.min(idx, 12) * 0.025,
                      }}
                      className="group border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="pl-4 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground sm:hidden">
                              {policy ? policy.carrier : "No policy"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {policy ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {policy.carrier}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {policy.policy_number}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No policy
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="truncate text-sm text-foreground">
                          {client.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.phone || "No phone"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {client.city || ""}
                          {client.city || client.state ? ", " : ""}
                          {client.state || ""}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right sm:pr-6">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          aria-label={`View ${client.first_name} ${client.last_name}`}
                          className="inline-flex"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="hidden sm:inline">View</span>
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>

            {/* Initial-load skeleton overlay (only on first search) */}
            {searching && rows.length === 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando clientes...
              </div>
            )}
          </div>

          {/* Empty state */}
          {isEmpty && !searching && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center sm:py-20">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {showNoResultsCopy
                  ? "No se encontraron clientes"
                  : "Aún no hay clientes"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {showNoResultsCopy
                  ? "Prueba ajustando la búsqueda o los filtros."
                  : "Agrega tu primer cliente para comenzar."}
              </p>
              {showNoResultsCopy ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5"
                  onClick={() => {
                    setSearchInput("");
                    setPendingCarriers([]);
                    setPendingStates([]);
                    setPendingHasPolicy([]);
                    void runQuery(
                      {
                        search: "",
                        carriers: [],
                        states: [],
                        hasPolicy: [],
                      },
                      "search"
                    );
                  }}
                >
                  Limpiar búsqueda
                </Button>
              ) : (
                <Link href="/dashboard/clients/new" className="mt-5">
                  <Button
                    variant="navy"
                    className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client &amp; Policy
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Footer / pagination */}
          {rows.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
              <div>
                Mostrando{" "}
                <span className="font-medium text-foreground">
                  {rows.length}
                </span>{" "}
                de{" "}
                <span className="font-medium text-foreground">
                  {totalCount}
                </span>{" "}
                {totalCount === 1 ? "cliente" : "clientes"}
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
                      Cargando...
                    </>
                  ) : (
                    "Ver más"
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

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <span className="max-w-[12rem] truncate">{label}</span>
      <button
        type="button"
        aria-label={`Quitar ${label}`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
