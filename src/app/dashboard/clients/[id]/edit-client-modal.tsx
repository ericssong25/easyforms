"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil } from "lucide-react";

const STATE_OPTIONS = [
  { label: "Alabama", value: "AL" }, { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" }, { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" }, { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" }, { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" }, { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" }, { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" }, { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" }, { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" }, { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" }, { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" }, { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" }, { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" }, { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" }, { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" }, { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" }, { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" }, { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" }, { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" }, { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" }, { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" }, { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" }, { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" }, { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" }, { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" }, { label: "Wyoming", value: "WY" },
  { label: "District of Columbia", value: "DC" },
];

const TAX_FILING_STATUS_OPTIONS = [
  { label: "Single (Soltero)", value: "Single" },
  { label: "Married Filing Jointly", value: "Married Filing Jointly" },
  { label: "Married Filing Separately", value: "Married Filing Separately" },
  { label: "Head of Household", value: "Head of Household" },
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Single (Soltero)", value: "Single" },
  { label: "Married (Casado)", value: "Married" },
  { label: "Divorced (Divorciado)", value: "Divorced" },
  { label: "Widowed (Viudo)", value: "Widowed" },
];

function formatSsn(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface EditClientModalProps {
  clientId: string;
  initialData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    ssn: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    date_of_birth: string;
    subscriber_number: string;
    holder_income: number | null;
    tax_filing_status: string;
    marital_status: string;
    tax_dependents_count: number | null;
  };
}

export function EditClientModal({ clientId, initialData }: EditClientModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialData);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ""),
          ssn_encrypted: form.ssn.replace(/\D/g, ""),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
          zip: form.zip.trim(),
          date_of_birth: form.date_of_birth || null,
          subscriber_number: form.subscriber_number.trim() || null,
          holder_income:
            form.holder_income != null && form.holder_income !== 0
              ? form.holder_income
              : null,
          tax_filing_status: form.tax_filing_status || null,
          marital_status: form.marital_status || null,
          tax_dependents_count:
            form.tax_dependents_count != null ? form.tax_dependents_count : null,
        })
        .eq("id", clientId);

      if (error) throw error;
      toast.success("Client updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update"
      );
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
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client Info</DialogTitle>
          <DialogDescription>
            Update personal information for this client
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", formatPhone(e.target.value))} maxLength={14} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SSN</Label>
            <Input value={form.ssn} onChange={(e) => update("ssn", formatSsn(e.target.value))} maxLength={11} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <select
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {STATE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={(e) => update("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} maxLength={5} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <DateInput value={form.date_of_birth} onChange={(v) => update("date_of_birth", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número de suscriptor</Label>
              <Input
                value={form.subscriber_number}
                onChange={(e) => update("subscriber_number", e.target.value)}
                placeholder="SUB-12345"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ingreso proyectado anual familiar ($)</Label>
              <Input
                type="number"
                value={form.holder_income ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    holder_income:
                      e.target.value === "" ? null : parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="20000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Forma de declarar impuestos</Label>
              <select
                value={form.tax_filing_status}
                onChange={(e) => update("tax_filing_status", e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {TAX_FILING_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Estatus Marital</Label>
              <select
                value={form.marital_status}
                onChange={(e) => update("marital_status", e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {MARITAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad de personas en su declaración de impuestos 2025</Label>
            <Input
              type="number"
              min={0}
              value={form.tax_dependents_count ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tax_dependents_count:
                    e.target.value === "" ? null : parseInt(e.target.value, 10) || 0,
                }))
              }
              placeholder="0"
            />
          </div>
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
