"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, ArrowLeft, Check, Plus, Trash2, UserRound, FileCheck, Users } from "lucide-react";

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

const steps = [
  { id: 1, label: "Client Info", icon: UserRound },
  { id: 2, label: "Policy Info", icon: FileCheck },
  { id: 3, label: "Dependents", icon: Users },
];

export function ClientWizard() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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

  const updateClient = (field: keyof ClientForm, value: string | boolean) => {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePolicy = (field: keyof PolicyForm, value: string | number) => {
    setPolicyForm((prev) => ({ ...prev, [field]: value }));
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

  const updateDependent = (
    id: string,
    field: keyof DependentForm,
    value: string | boolean
  ) => {
    setDependents((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveClient = async () => {
    if (!clientForm.first_name || !clientForm.last_name || !clientForm.email) {
      toast.error("Please fill in required client fields");
      return;
    }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const { data: client, error } = await supabase
        .from("clients")
        .insert({
          agent_id: existingUser.user.id,
          first_name: clientForm.first_name,
          last_name: clientForm.last_name,
          ssn_encrypted: clientForm.ssn,
          applies_to_policy: clientForm.applies_to_policy,
          email: clientForm.email,
          phone: clientForm.phone,
          address: clientForm.address,
          city: clientForm.city,
          state: clientForm.state,
          zip: clientForm.zip,
          date_of_birth: clientForm.date_of_birth,
        })
        .select()
        .single();

      if (error) throw error;
      setClientId(client.id);
      toast.success("Client created successfully");
      setStep(2);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create client"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!clientId || !policyForm.carrier || !policyForm.policy_number) {
      toast.error("Please fill in required policy fields");
      return;
    }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase.auth.getUser();
      if (!existingUser.user) throw new Error("Not authenticated");

      const { data: policy, error } = await supabase
        .from("policies")
        .insert({
          agent_id: existingUser.user.id,
          carrier: policyForm.carrier,
          plan: policyForm.plan,
          policy_number: policyForm.policy_number,
          premium: policyForm.premium,
          effective_date: policyForm.effective_date,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("clients")
        .update({ policy_id: policy.id })
        .eq("id", clientId);

      setPolicyId(policy.id);
      toast.success("Policy created successfully");
      setStep(3);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create policy"
      );
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
      toast.success("Client and policy saved. Redirecting...");
      router.push("/dashboard/clients");
      router.refresh();
      return;
    }

    setLoading(true);
    try {
      for (const dep of dependents) {
        if (!dep.first_name || !dep.last_name) continue;

        const { error } = await supabase.from("dependents").insert({
          client_id: clientId,
          policy_id: policyId,
          first_name: dep.first_name,
          last_name: dep.last_name,
          applies_to_policy: dep.applies_to_policy,
          date_of_birth: dep.date_of_birth,
        });

        if (error) throw error;
      }

      toast.success("Client, policy, and dependents saved successfully");
      router.push("/dashboard/clients");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save dependents"
      );
    } finally {
      setLoading(false);
    }
  };

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

      {step === 1 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={clientForm.first_name}
                  onChange={(e) => updateClient("first_name", e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={clientForm.last_name}
                  onChange={(e) => updateClient("last_name", e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={clientForm.email}
                onChange={(e) => updateClient("email", e.target.value)}
                placeholder="client@email.com"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={clientForm.phone}
                  onChange={(e) => updateClient("phone", e.target.value)}
                  placeholder="555-0123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ssn">SSN (Encrypted)</Label>
                <Input
                  id="ssn"
                  value={clientForm.ssn}
                  onChange={(e) => updateClient("ssn", e.target.value)}
                  placeholder="XXX-XX-XXXX"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={clientForm.address}
                onChange={(e) => updateClient("address", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={clientForm.city}
                  onChange={(e) => updateClient("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={clientForm.state}
                  onChange={(e) => updateClient("state", e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={clientForm.zip}
                  onChange={(e) => updateClient("zip", e.target.value)}
                  placeholder="10001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={clientForm.date_of_birth}
                onChange={(e) =>
                  updateClient("date_of_birth", e.target.value)
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="applies_to_policy"
                checked={clientForm.applies_to_policy}
                onCheckedChange={(checked) =>
                  updateClient("applies_to_policy", !!checked)
                }
              />
              <Label htmlFor="applies_to_policy">
                This client is a policyholder
              </Label>
            </div>
            <div className="flex justify-end">
              <Button
                variant="navy"
                onClick={handleSaveClient}
                disabled={loading}
              >
                {loading ? "Saving..." : "Next: Policy Info"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">Insurance Carrier *</Label>
                <Input
                  id="carrier"
                  value={policyForm.carrier}
                  onChange={(e) => updatePolicy("carrier", e.target.value)}
                  placeholder="Blue Cross"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan Name</Label>
                <Input
                  id="plan"
                  value={policyForm.plan}
                  onChange={(e) => updatePolicy("plan", e.target.value)}
                  placeholder="Gold PPO"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy_number">Policy Number *</Label>
                <Input
                  id="policy_number"
                  value={policyForm.policy_number}
                  onChange={(e) =>
                    updatePolicy("policy_number", e.target.value)
                  }
                  placeholder="POL-12345"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="premium">Monthly Premium ($)</Label>
                <Input
                  id="premium"
                  type="number"
                  value={policyForm.premium || ""}
                  onChange={(e) =>
                    updatePolicy("premium", parseFloat(e.target.value) || 0)
                  }
                  placeholder="250.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={policyForm.effective_date}
                onChange={(e) =>
                  updatePolicy("effective_date", e.target.value)
                }
              />
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="navy"
                onClick={handleSavePolicy}
                disabled={loading}
              >
                {loading ? "Saving..." : "Next: Dependents"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dependents</CardTitle>
              <Button variant="outline" size="sm" onClick={addDependent}>
                <Plus className="mr-1 h-3 w-3" />
                Add Dependent
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {dependents.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No dependents added. Click &quot;Add Dependent&quot; or skip.
                </p>
              </div>
            ) : (
              dependents.map((dep, index) => (
                <div
                  key={dep.id}
                  className="relative rounded-xl border border-slate-200 p-4"
                >
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
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={dep.first_name}
                        onChange={(e) =>
                          updateDependent(dep.id, "first_name", e.target.value)
                        }
                        placeholder="Jane"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={dep.last_name}
                        onChange={(e) =>
                          updateDependent(dep.id, "last_name", e.target.value)
                        }
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={dep.date_of_birth}
                        onChange={(e) =>
                          updateDependent(
                            dep.id,
                            "date_of_birth",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox
                        checked={dep.applies_to_policy}
                        onCheckedChange={(checked) =>
                          updateDependent(
                            dep.id,
                            "applies_to_policy",
                            !!checked
                          )
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
              <Button
                variant="navy"
                onClick={handleSaveDependents}
                disabled={loading}
              >
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
