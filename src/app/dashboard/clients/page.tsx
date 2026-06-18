import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientsSearchWrapper } from "./clients-search-wrapper";
import { queryClientsAction } from "@/lib/actions/clients";

const PAGE_SIZE = 25;

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Initial server-side page: 25 most-recent clients for this agent. The
  // client wrapper handles subsequent pages, search, and filters.
  const initial = await queryClientsAction({
    from: 0,
    to: PAGE_SIZE - 1,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Clients &amp; Policies
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your client records and policy information
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="sm:self-start">
          <Button
            variant="navy"
            className="w-full transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Client &amp; Policy
          </Button>
        </Link>
      </div>

      <ClientsSearchWrapper
        initialRows={initial.rows}
        initialTotalCount={initial.totalCount}
        initialHasMore={initial.hasMore}
        initialCarriers={initial.facets.carriers}
        initialStates={initial.facets.states}
      />
    </div>
  );
}
