"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface DependentData {
  id: string;
  first_name: string;
  last_name: string;
  applies_to_policy: boolean;
  date_of_birth: string;
}

interface EditDependentsModalProps {
  clientId: string;
  policyId: string;
  initialData: DependentData[];
}

export function EditDependentsModal({
  clientId,
  policyId,
  initialData,
}: EditDependentsModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dependents, setDependents] = useState<DependentData[]>(initialData);
  const [removed, setRemoved] = useState<string[]>([]);

  const add = () => {
    setDependents((prev) => [
      ...prev,
      { id: crypto.randomUUID(), first_name: "", last_name: "", applies_to_policy: false, date_of_birth: "" },
    ]);
  };

  const remove = (id: string) => {
    const exists = initialData.some((d) => d.id === id);
    if (exists) setRemoved((prev) => [...prev, id]);
    setDependents((prev) => prev.filter((d) => d.id !== id));
  };

  const update = (id: string, field: string, value: string | boolean) => {
    setDependents((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete removed
      for (const id of removed) {
        await supabase.from("dependents").delete().eq("id", id);
      }

      for (const dep of dependents) {
        if (!dep.first_name.trim() || !dep.last_name.trim()) continue;
        const exists = initialData.some((d) => d.id === dep.id);
        if (exists) {
          await supabase
            .from("dependents")
            .update({
              first_name: dep.first_name.trim(),
              last_name: dep.last_name.trim(),
              applies_to_policy: dep.applies_to_policy,
              date_of_birth: dep.date_of_birth || null,
            })
            .eq("id", dep.id);
        } else {
          await supabase.from("dependents").insert({
            client_id: clientId,
            policy_id: policyId,
            first_name: dep.first_name.trim(),
            last_name: dep.last_name.trim(),
            applies_to_policy: dep.applies_to_policy,
            date_of_birth: dep.date_of_birth || null,
          });
        }
      }

      toast.success("Dependents updated");
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
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dependents</DialogTitle>
          <DialogDescription>
            Add, edit, or remove dependents covered by this policy
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {dependents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No dependents added yet
            </p>
          ) : (
            dependents.map((dep, i) => (
              <div key={dep.id} className="relative rounded-xl border border-border p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7"
                  onClick={() => remove(dep.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <p className="mb-2 text-xs font-medium text-foreground">Dependent {i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name</Label>
                    <Input value={dep.first_name} onChange={(e) => update(dep.id, "first_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input value={dep.last_name} onChange={(e) => update(dep.id, "last_name", e.target.value)} />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>DOB</Label>
                    <DateInput value={dep.date_of_birth} onChange={(v) => update(dep.id, "date_of_birth", v)} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Checkbox
                      checked={dep.applies_to_policy}
                      onCheckedChange={(c) => update(dep.id, "applies_to_policy", !!c)}
                    />
                    <Label>Covered</Label>
                  </div>
                </div>
              </div>
            ))
          )}

          <Button variant="outline" size="sm" onClick={add} className="w-full">
            <Plus className="mr-1 h-3 w-3" />
            Add Dependent
          </Button>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="navy" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
