"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { getAllCarrierNames, getPlansForCarrier } from "@/lib/insurance-data";

interface EditPolicyModalProps {
  clientId: string;
  initialData?: {
    id?: string;
    carrier: string;
    plan: string;
    policy_number: string;
    premium: number;
    effective_date: string;
  } | null;
}

export function EditPolicyModal({ clientId, initialData }: EditPolicyModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    carrier: initialData?.carrier || "",
    plan: initialData?.plan || "",
    policy_number: initialData?.policy_number || "",
    premium: initialData?.premium || 0,
    effective_date: initialData?.effective_date || "",
  });

  const hasExistingPolicy = !!initialData?.id;

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.carrier.trim()) { toast.error("Carrier is required"); return; }
    if (!form.policy_number.trim()) { toast.error("Policy number is required"); return; }
    setLoading(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      if (hasExistingPolicy) {
        const { error } = await supabase
          .from("policies")
          .update({
            carrier: form.carrier.trim(),
            plan: form.plan.trim(),
            policy_number: form.policy_number.trim(),
            premium: form.premium || 0,
            effective_date: form.effective_date || null,
          })
          .eq("id", initialData!.id);

        if (error) throw error;
        toast.success("Policy updated");
      } else {
        const { data: policy, error } = await supabase
          .from("policies")
          .insert({
            agent_id: existingUser.user.id,
            carrier: form.carrier.trim(),
            plan: form.plan.trim(),
            policy_number: form.policy_number.trim(),
            premium: form.premium || 0,
            effective_date: form.effective_date || null,
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from("clients")
          .update({ policy_id: policy.id })
          .eq("id", clientId);

        toast.success("Policy created");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">{initialData ? "Edit" : "Add"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {hasExistingPolicy ? "Edit Policy" : "Add Policy"}
          </DialogTitle>
          <DialogDescription>
            {hasExistingPolicy
              ? "Update the insurance policy details"
              : "Assign an insurance policy to this client"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Carrier <span className="text-destructive">*</span></Label>
              <Combobox
                options={getAllCarrierNames()}
                value={form.carrier}
                onChange={(v) => { update("carrier", v); update("plan", ""); }}
                placeholder="Search carriers..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Combobox
                options={form.carrier ? getPlansForCarrier(form.carrier) : []}
                value={form.plan}
                onChange={(v) => update("plan", v)}
                placeholder={form.carrier ? "Search plans..." : "Select carrier first"}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Policy # <span className="text-destructive">*</span></Label>
              <Input value={form.policy_number} onChange={(e) => update("policy_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Premium ($)</Label>
              <Input type="number" value={form.premium || ""} onChange={(e) => update("premium", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Effective Date</Label>
            <DateInput value={form.effective_date} onChange={(v) => update("effective_date", v)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="navy" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : hasExistingPolicy ? "Update Policy" : "Create Policy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
