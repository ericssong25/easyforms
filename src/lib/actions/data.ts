import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ClientFormData,
  PolicyFormData,
  DependentFormData,
} from "@/lib/types";

export async function createClientAction(data: ClientFormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      agent_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      ssn_encrypted: data.ssn,
      applies_to_policy: data.applies_to_policy,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      date_of_birth: data.date_of_birth,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/dashboard/clients");
  return client;
}

export async function createPolicyAction(
  clientId: string,
  data: PolicyFormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: policy, error } = await supabase
    .from("policies")
    .insert({
      agent_id: user.id,
      carrier: data.carrier,
      plan: data.plan,
      policy_number: data.policy_number,
      premium: data.premium,
      effective_date: data.effective_date,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("clients")
    .update({ policy_id: policy.id })
    .eq("id", clientId)
    .eq("agent_id", user.id);

  revalidatePath("/dashboard/clients");
  return policy;
}

export async function createDependentAction(
  clientId: string,
  policyId: string,
  data: DependentFormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: dependent, error } = await supabase
    .from("dependents")
    .insert({
      client_id: clientId,
      policy_id: policyId,
      first_name: data.first_name,
      last_name: data.last_name,
      applies_to_policy: data.applies_to_policy,
      date_of_birth: data.date_of_birth,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/dashboard/clients");
  return dependent;
}

export async function createTemplateAction(name: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      agent_id: user.id,
      name,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/dashboard/forms");
  return template;
}

export async function createSubmissionAction(
  clientId: string,
  templateId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: submission, error } = await supabase
    .from("form_submissions")
    .insert({
      agent_id: user.id,
      client_id: clientId,
      template_id: templateId,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("tracking_events").insert({
    submission_id: submission.id,
    event_type: "created",
    ip_address: "server",
    user_agent: "server",
    device_type: "Desktop",
  });

  revalidatePath("/dashboard/forms");
  return submission;
}

export async function updateSubmissionStatusAction(
  submissionId: string,
  status: string,
  eventType: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("form_submissions")
    .update({ status })
    .eq("id", submissionId)
    .eq("agent_id", user.id);

  if (error) throw error;

  await supabase.from("tracking_events").insert({
    submission_id: submissionId,
    event_type: eventType,
    ip_address: "server",
    user_agent: "server",
    device_type: "Desktop",
  });

  revalidatePath("/dashboard/submissions");
}
