"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import { DateInput } from "@/components/ui/date-input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  UserRound,
  FileCheck,
  Users,
  MapPin,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Lock,
  BadgeCheck,
} from "lucide-react";
import {
  getAllCarrierNames,
  getPlansForCarrier,
} from "@/lib/insurance-data";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";

interface ValidationErrors {
  [key: string]: string;
}

interface ClientForm {
  first_name: string;
  last_name: string;
  ssn: string;
  applies_to_policy: boolean;
  email: string;
  phone: string;
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
}

interface PolicyForm {
  carrier: string;
  plan: string;
  policy_number: string;
  premium: number;
  effective_date: string;
}

interface DependentForm {
  id: string;
  first_name: string;
  last_name: string;
  applies_to_policy: boolean;
  date_of_birth: string;
}

const STATE_OPTIONS: { label: string; value: string }[] = [
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
  { label: "Married Filing Jointly (Casado, declarando juntos)", value: "Married Filing Jointly" },
  { label: "Married Filing Separately (Casado, declarando por separado)", value: "Married Filing Separately" },
  { label: "Head of Household (Cabeza de familia)", value: "Head of Household" },
];

const MARITAL_STATUS_OPTIONS = [
  { label: "Single (Soltero)", value: "Single" },
  { label: "Married (Casado)", value: "Married" },
  { label: "Divorced (Divorciado)", value: "Divorced" },
  { label: "Widowed (Viudo)", value: "Widowed" },
];

const steps = [
  { id: 1, label: "Client Info", icon: UserRound },
  { id: 2, label: "Policy Info", icon: FileCheck },
  { id: 3, label: "Dependents", icon: Users },
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidSsn(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, "");
  return digits.length === 9;
}

export function ClientWizard({ resumeClientId }: { resumeClientId?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const {
    suggestions: addressSuggestions,
    loading: addressLoading,
    open: addressOpen,
    search: searchAddress,
    selectSuggestion: selectAddressSuggestion,
    close: closeAddress,
  } = useAddressAutocomplete();

  const addressContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        addressContainerRef.current &&
        !addressContainerRef.current.contains(e.target as Node)
      ) {
        closeAddress();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeAddress]);

  const [clientForm, setClientForm] = useState<ClientForm>({
    first_name: "",
    last_name: "",
    ssn: "",
    applies_to_policy: false,
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    date_of_birth: "",
    subscriber_number: "",
    holder_income: null,
    tax_filing_status: "",
    marital_status: "",
    tax_dependents_count: null,
  });

  const [policyForm, setPolicyForm] = useState<PolicyForm>({
    carrier: "",
    plan: "",
    policy_number: "",
    premium: 0,
    effective_date: "",
  });

  const [dependents, setDependents] = useState<DependentForm[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string | null>(null);

  // Resume: load existing client data and skip to policy step
  useEffect(() => {
    if (!resumeClientId) return;
    const load = async () => {
      const { data: c } = await supabase
        .from("clients")
        .select("*, policies!clients_policy_id_fkey(*)")
        .eq("id", resumeClientId)
        .single();
      if (!c) return;

      setClientId(c.id);
      setClientForm({
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        ssn: c.ssn_encrypted ? String(c.ssn_encrypted) : "",
        applies_to_policy: c.applies_to_policy || false,
        email: c.email || "",
        phone: c.phone ? String(c.phone) : "",
        address: c.address || "",
        city: c.city || "",
        state: c.state || "",
        zip: c.zip || "",
        date_of_birth: c.date_of_birth ? String(c.date_of_birth) : "",
        subscriber_number: c.subscriber_number ? String(c.subscriber_number) : "",
        holder_income:
          c.holder_income != null ? Number(c.holder_income) : null,
        tax_filing_status: c.tax_filing_status || "",
        marital_status: c.marital_status || "",
        tax_dependents_count:
          c.tax_dependents_count != null ? Number(c.tax_dependents_count) : null,
      });

      if (c.policies) {
        setPolicyId(c.policies.id);
        setPolicyForm({
          carrier: c.policies.carrier || "",
          plan: c.policies.plan || "",
          policy_number: c.policies.policy_number || "",
          premium: Number(c.policies.premium) || 0,
          effective_date: c.policies.effective_date ? String(c.policies.effective_date) : "",
        });
        setStep(3);
      } else {
        setStep(2);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeClientId]);

  const markTouched = (field: string) => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const updateClient = (
    field: keyof ClientForm,
    value: string | boolean | number | null
  ) => {
    setClientForm((prev) => ({ ...prev, [field]: value }));
    markTouched(field);
    validateClientField(field, value);
  };

  const updatePolicy = (field: keyof PolicyForm, value: string | number) => {
    setPolicyForm((prev) => ({ ...prev, [field]: value }));
    markTouched(field);
  };

  const validateClientField = (
    field: keyof ClientForm,
    value?: string | boolean | number | null
  ) => {
    const v = value !== undefined ? value : clientForm[field];
    const newErrors = { ...errors };

    if (field === "first_name" && !String(v).trim()) {
      newErrors.first_name = "First name is required";
    } else if (field === "first_name") delete newErrors.first_name;

    if (field === "last_name" && !String(v).trim()) {
      newErrors.last_name = "Last name is required";
    } else if (field === "last_name") delete newErrors.last_name;

    if (field === "email" && String(v).trim() && !isValidEmail(String(v))) {
      newErrors.email = "Please enter a valid email address";
    } else if (field === "email") delete newErrors.email;

    if (field === "ssn" && String(v).trim() && !isValidSsn(String(v))) {
      newErrors.ssn = "SSN must be exactly 9 digits";
    } else if (field === "ssn") {
      if (!String(v).trim()) newErrors.ssn = "SSN is required";
      else delete newErrors.ssn;
    }

    if (field === "phone" && !String(v).trim()) {
      newErrors.phone = "Phone number is required";
    } else if (field === "phone") delete newErrors.phone;

    if (field === "date_of_birth") {
      if (!String(v).trim()) newErrors.date_of_birth = "Date of birth is required";
      else {
        const d = new Date(String(v));
        if (d > new Date()) newErrors.date_of_birth = "Date cannot be in the future";
        else delete newErrors.date_of_birth;
      }
    }

    setErrors(newErrors);
  };

  const validateClientStep = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!clientForm.first_name.trim()) newErrors.first_name = "First name is required";
    if (!clientForm.last_name.trim()) newErrors.last_name = "Last name is required";
    if (clientForm.email.trim() && !isValidEmail(clientForm.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!clientForm.ssn.trim() || !isValidSsn(clientForm.ssn)) {
      newErrors.ssn = "SSN is required (9 digits)";
    }
    if (!clientForm.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!clientForm.date_of_birth.trim()) {
      newErrors.date_of_birth = "Date of birth is required";
    }
    setErrors(newErrors);
    Object.keys(newErrors).forEach((k) => markTouched(k));
    return Object.keys(newErrors).length === 0;
  };

  const validatePolicyStep = (): boolean => {
    if (!policyForm.carrier.trim()) {
      toast.error("Insurance carrier is required");
      return false;
    }
    if (!policyForm.policy_number.trim()) {
      toast.error("Policy number is required");
      return false;
    }
    return true;
  };

  const addDependent = () => {
    setDependents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        first_name: "",
        last_name: "",
        applies_to_policy: false,
        date_of_birth: "",
      },
    ]);
  };

  const removeDependent = (id: string) => {
    setDependents((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDependent = (id: string, field: keyof DependentForm, value: string | boolean) => {
    setDependents((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveClient = async () => {
    if (!validateClientStep()) return;

    setLoading(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const { data: client, error } = await supabase
        .from("clients")
        .insert({
          agent_id: existingUser.user.id,
          first_name: clientForm.first_name.trim(),
          last_name: clientForm.last_name.trim(),
          ssn_encrypted: clientForm.ssn.replace(/\D/g, ""),
          applies_to_policy: clientForm.applies_to_policy,
          email: clientForm.email.trim(),
          phone: clientForm.phone.replace(/\D/g, ""),
          address: clientForm.address.trim(),
          city: clientForm.city.trim(),
          state: clientForm.state.trim().toUpperCase(),
          zip: clientForm.zip.trim(),
          date_of_birth: clientForm.date_of_birth || null,
          subscriber_number: clientForm.subscriber_number.trim() || null,
          holder_income:
            clientForm.holder_income != null && clientForm.holder_income !== 0
              ? clientForm.holder_income
              : null,
          tax_filing_status: clientForm.tax_filing_status || null,
          marital_status: clientForm.marital_status || null,
          tax_dependents_count:
            clientForm.tax_dependents_count != null
              ? clientForm.tax_dependents_count
              : null,
        })
        .select()
        .single();

      if (error) throw error;
      setClientId(client.id);
      toast.success("Client created successfully");
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!clientId || !validatePolicyStep()) return;

    setLoading(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const { data: policy, error } = await supabase
        .from("policies")
        .insert({
          agent_id: existingUser.user.id,
          carrier: policyForm.carrier.trim(),
          plan: policyForm.plan.trim(),
          policy_number: policyForm.policy_number.trim(),
          premium: policyForm.premium || 0,
          effective_date: policyForm.effective_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("clients")
        .update({ policy_id: policy.id })
        .eq("id", clientId);

      setPolicyId(policy.id);
      toast.success("Policy saved successfully");
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save policy");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDependents = async () => {
    if (!clientId || !policyId) {
      toast.error("Client and policy must be created first");
      return;
    }

    if (dependents.length === 0) {
      toast.success(`Redirecting to ${clientForm.first_name}'s profile...`);
      router.push(`/dashboard/clients/${clientId}`);
      router.refresh();
      return;
    }

    setLoading(true);
    try {
      for (const dep of dependents) {
        if (!dep.first_name.trim() || !dep.last_name.trim()) continue;

        const { error } = await supabase.from("dependents").insert({
          client_id: clientId,
          policy_id: policyId,
          first_name: dep.first_name.trim(),
          last_name: dep.last_name.trim(),
          applies_to_policy: dep.applies_to_policy,
          date_of_birth: dep.date_of_birth || null,
        });

        if (error) throw error;
      }

      toast.success(`Saved! Redirecting to ${clientForm.first_name}'s profile...`);
      router.push(`/dashboard/clients/${clientId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save dependents");
    } finally {
      setLoading(false);
    }
  };

  const hasError = (field: string): boolean => touched.has(field) && !!errors[field];

  const fieldClass = (field: string) =>
    hasError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <nav className="flex items-center justify-center gap-2">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                disabled={s.id > step}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  step === s.id
                    ? "bg-navy text-white"
                    : step > s.id
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                {s.label}
              </button>
              {s.id < 3 && <Separator className="w-8" />}
            </div>
          ))}
        </nav>
      </div>

      {/* STEP 1: Client Info */}
      {step === 1 && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-navy/10 p-1.5">
                <UserRound className="h-4 w-4 text-navy" />
              </div>
              <div>
                <CardTitle className="text-lg">Client Information</CardTitle>
                <CardDescription>
                  Enter your client&apos;s personal details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="flex items-center gap-1">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={clientForm.first_name}
                  onChange={(e) => updateClient("first_name", e.target.value)}
                  placeholder="John"
                  className={fieldClass("first_name")}
                />
                {hasError("first_name") && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="flex items-center gap-1">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={clientForm.last_name}
                  onChange={(e) => updateClient("last_name", e.target.value)}
                  placeholder="Smith"
                  className={fieldClass("last_name")}
                />
                {hasError("last_name") && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => updateClient("email", e.target.value)}
                  placeholder="client@email.com"
                  className={fieldClass("email")}
                />
                {hasError("email") && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={clientForm.phone}
                  onChange={(e) => updateClient("phone", formatPhone(e.target.value))}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className={fieldClass("phone")}
                />
                {hasError("phone") && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* SSN + DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ssn" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  SSN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ssn"
                  value={clientForm.ssn}
                  onChange={(e) => updateClient("ssn", formatSsn(e.target.value))}
                  placeholder="123-45-6789"
                  maxLength={11}
                  className={fieldClass("ssn")}
                />
                {hasError("ssn") && (
                  <p className="text-xs text-destructive">{errors.ssn}</p>
                )}
                {!hasError("ssn") && (
                  <p className="text-xs text-muted-foreground">
                    Encrypted at rest
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_of_birth" className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <DateInput
                  id="date_of_birth"
                  value={clientForm.date_of_birth}
                  onChange={(v) => updateClient("date_of_birth", v)}
                  placeholder="MM/DD/YYYY"
                  className={fieldClass("date_of_birth")}
                />
                {hasError("date_of_birth") && (
                  <p className="text-xs text-destructive">{errors.date_of_birth}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5" ref={addressContainerRef}>
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Address
              </Label>
              <div className="relative">
                <Input
                  id="address"
                  value={clientForm.address}
                  onChange={(e) => {
                    updateClient("address", e.target.value);
                    searchAddress(e.target.value);
                  }}
                  placeholder="Start typing your address..."
                />
                {addressLoading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {addressOpen && addressSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-md">
                    {addressSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const parts = selectAddressSuggestion(s);
                          updateClient("address", parts.address);
                          updateClient("city", parts.city);
                          updateClient("state", parts.state);
                          updateClient("zip", parts.zip);
                        }}
                        className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/50"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="line-clamp-2">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* City / State / ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={clientForm.city}
                  onChange={(e) => updateClient("city", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={clientForm.state}
                  onChange={(e) => updateClient("state", e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select...</option>
                  {STATE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={clientForm.zip}
                  onChange={(e) => updateClient("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="10001"
                  maxLength={5}
                />
              </div>
            </div>

            {/* Policyholder toggle */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Checkbox
                id="applies_to_policy"
                checked={clientForm.applies_to_policy}
                onCheckedChange={(checked) => updateClient("applies_to_policy", !!checked)}
              />
              <Label htmlFor="applies_to_policy" className="cursor-pointer">
                This client is the policyholder
              </Label>
            </div>

            {/* Subscriber Number + Annual Income */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="subscriber_number">Número de suscriptor</Label>
                <Input
                  id="subscriber_number"
                  value={clientForm.subscriber_number}
                  onChange={(e) => updateClient("subscriber_number", e.target.value)}
                  placeholder="SUB-12345"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holder_income">
                  Ingreso proyectado anual familiar ($)
                </Label>
                <Input
                  id="holder_income"
                  type="number"
                  value={clientForm.holder_income ?? ""}
                  onChange={(e) =>
                    updateClient(
                      "holder_income",
                      e.target.value === "" ? null : parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="20000"
                />
              </div>
            </div>

            {/* Tax Filing + Marital Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tax_filing_status">
                  Forma de declarar impuestos
                </Label>
                <select
                  id="tax_filing_status"
                  value={clientForm.tax_filing_status}
                  onChange={(e) => updateClient("tax_filing_status", e.target.value)}
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
                <Label htmlFor="marital_status">Estatus Marital</Label>
                <select
                  id="marital_status"
                  value={clientForm.marital_status}
                  onChange={(e) => updateClient("marital_status", e.target.value)}
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

            {/* Tax Dependents Count */}
            <div className="space-y-1.5">
              <Label htmlFor="tax_dependents_count">
                Cantidad de personas en su declaración de impuestos 2025
              </Label>
              <Input
                id="tax_dependents_count"
                type="number"
                min={0}
                value={clientForm.tax_dependents_count ?? ""}
                onChange={(e) =>
                  updateClient(
                    "tax_dependents_count",
                    e.target.value === "" ? null : parseInt(e.target.value, 10) || 0
                  )
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Se usa en consentimientos del Mercado. La cantidad de personas con
                cobertura se calcula automáticamente desde los dependientes.
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="navy" onClick={handleSaveClient} disabled={loading}>
                {loading ? "Saving..." : "Next: Policy Info"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Policy Info */}
      {step === 2 && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-blue/10 p-1.5">
                <FileCheck className="h-4 w-4 text-slate-blue" />
              </div>
              <div>
                <CardTitle className="text-lg">Policy Information</CardTitle>
                <CardDescription>
                  Select the insurance carrier and plan details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Carrier + Plan with smart search */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Insurance Carrier <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  options={getAllCarrierNames()}
                  value={policyForm.carrier}
                  onChange={(v) => {
                    updatePolicy("carrier", v);
                    updatePolicy("plan", "");
                  }}
                  placeholder="Search carriers..."
                  emptyText="No carriers found. Type a custom name."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Plan Name
                </Label>
                <Combobox
                  options={
                    policyForm.carrier
                      ? getPlansForCarrier(policyForm.carrier)
                      : []
                  }
                  value={policyForm.plan}
                  onChange={(v) => updatePolicy("plan", v)}
                  placeholder={
                    policyForm.carrier
                      ? "Search plans or type custom..."
                      : "Select a carrier first"
                  }
                  emptyText="No plans match. Type a custom name."
                />
              </div>
            </div>

            {/* Policy Number + Premium */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Policy Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="policy_number"
                  value={policyForm.policy_number}
                  onChange={(e) => updatePolicy("policy_number", e.target.value)}
                  placeholder="POL-12345"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Monthly Premium ($)
                </Label>
                <Input
                  id="premium"
                  type="number"
                  value={policyForm.premium || ""}
                  onChange={(e) => updatePolicy("premium", parseFloat(e.target.value) || 0)}
                  placeholder="250.00"
                />
              </div>
            </div>

            {/* Effective Date */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Effective Date
              </Label>
              <DateInput
                id="effective_date"
                value={policyForm.effective_date}
                onChange={(v) => updatePolicy("effective_date", v)}
                placeholder="MM/DD/YYYY"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="navy" onClick={handleSavePolicy} disabled={loading}>
                {loading ? "Saving..." : "Next: Dependents"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Dependents */}
      {step === 3 && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald/10 p-1.5">
                  <Users className="h-4 w-4 text-emerald" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dependents</CardTitle>
                  <CardDescription>
                    Add family members covered by this policy (optional)
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={addDependent}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dependents.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No dependents added. Click &quot;Add&quot; or skip.
                </p>
              </div>
            ) : (
              dependents.map((dep, index) => (
                <div key={dep.id} className="relative rounded-xl border border-slate-200 p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => removeDependent(dep.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <p className="mb-3 text-sm font-medium text-navy">
                    Dependent {index + 1}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>First Name</Label>
                      <Input
                        value={dep.first_name}
                        onChange={(e) => updateDependent(dep.id, "first_name", e.target.value)}
                        placeholder="Jane"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name</Label>
                      <Input
                        value={dep.last_name}
                        onChange={(e) => updateDependent(dep.id, "last_name", e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Date of Birth
                      </Label>
                      <Input
                        type="date"
                        value={dep.date_of_birth}
                        onChange={(e) => updateDependent(dep.id, "date_of_birth", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        checked={dep.applies_to_policy}
                        onCheckedChange={(checked) =>
                          updateDependent(dep.id, "applies_to_policy", !!checked)
                        }
                      />
                      <Label>Covered by policy</Label>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="navy" onClick={handleSaveDependents} disabled={loading}>
                {loading ? "Saving..." : "Complete & Save"}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
