export type FormSubmissionStatus = "draft" | "sent" | "opened" | "signed";

export interface Agent {
  id: string;
  email: string;
  full_name: string;
  agency_name: string;
  npn: string;
  phone: string;
}

export interface Client {
  id: string;
  agent_id: string;
  policy_id: string | null;
  first_name: string;
  last_name: string;
  ssn_encrypted: string | null;
  applies_to_policy: boolean;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date_of_birth: string;
  subscriber_number: string | null;
  holder_income: number | null;
  tax_filing_status: string | null;
  marital_status: string | null;
  tax_dependents_count: number | null;
  created_at: string;
}

export interface Policy {
  id: string;
  agent_id: string;
  carrier: string;
  plan: string;
  policy_number: string;
  premium: number;
  effective_date: string;
  created_at: string;
}

export interface Dependent {
  id: string;
  client_id: string;
  policy_id: string;
  first_name: string;
  last_name: string;
  applies_to_policy: boolean;
  date_of_birth: string;
}

export interface Template {
  id: string;
  agent_id: string;
  name: string;
  content: string;
  created_at: string;
}

export interface FormSubmission {
  id: string;
  agent_id: string;
  client_id: string;
  template_id: string;
  status: FormSubmissionStatus;
  signed_pdf_url: string | null;
  created_at: string;
}

export interface TrackingEvent {
  id: string;
  submission_id: string;
  event_type: string;
  created_at: string;
}

export interface ClientFormData {
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

export interface PolicyFormData {
  carrier: string;
  plan: string;
  policy_number: string;
  premium: number;
  effective_date: string;
}

export interface DependentFormData {
  first_name: string;
  last_name: string;
  applies_to_policy: boolean;
  date_of_birth: string;
}
