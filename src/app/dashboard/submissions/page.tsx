import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmissionsSearchWrapper } from "./submissions-search-wrapper";
import { querySubmissionsAction } from "@/lib/actions/submissions";

const PAGE_SIZE = 25;

export default async function SubmissionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Initial server-side page: 25 most-recent submissions for this agent.
  // The wrapper handles subsequent pages, search, and status filter.
  const initial = await querySubmissionsAction({
    from: 0,
    to: PAGE_SIZE - 1,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <SubmissionsSearchWrapper
        initialRows={initial.rows}
        initialTotalCount={initial.totalCount}
        initialHasMore={initial.hasMore}
        initialStatusCounts={initial.statusCounts}
      />
    </div>
  );
}
