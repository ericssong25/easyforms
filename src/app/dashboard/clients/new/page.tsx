import { ClientWizard } from "@/components/forms/client-wizard";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Add Client & Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new client record with policy details and dependents
        </p>
      </div>
      <ClientWizard />
    </div>
  );
}
