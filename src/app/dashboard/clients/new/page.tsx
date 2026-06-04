import { ClientWizard } from "@/components/forms/client-wizard";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const { resume } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          {resume ? "Complete Client Setup" : "Add Client & Policy"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {resume
            ? "Continue setting up this client's policy and dependents"
            : "Create a new client record with policy details and dependents"}
        </p>
      </div>
      <ClientWizard resumeClientId={resume} />
    </div>
  );
}
