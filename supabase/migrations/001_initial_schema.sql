-- Easy Forms Database Schema
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- AGENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  agency_name TEXT,
  npn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- POLICIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  plan TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  premium DECIMAL(10, 2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_agent_id ON policies(agent_id);

-- =====================================================
-- CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  ssn_encrypted TEXT,
  applies_to_policy BOOLEAN NOT NULL DEFAULT false,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_agent_id ON clients(agent_id);
CREATE INDEX idx_clients_policy_id ON clients(policy_id);

-- =====================================================
-- DEPENDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dependents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  applies_to_policy BOOLEAN NOT NULL DEFAULT false,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dependents_client_id ON dependents(client_id);
CREATE INDEX idx_dependents_policy_id ON dependents(policy_id);

-- =====================================================
-- TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_agent_id ON templates(agent_id);

-- =====================================================
-- FORM SUBMISSIONS TABLE
-- =====================================================
CREATE TYPE form_submission_status AS ENUM ('draft', 'sent', 'opened', 'signed');

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  status form_submission_status NOT NULL DEFAULT 'draft',
  signed_pdf_url TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_agent_id ON form_submissions(agent_id);
CREATE INDEX idx_form_submissions_client_id ON form_submissions(client_id);
CREATE INDEX idx_form_submissions_template_id ON form_submissions(template_id);

-- =====================================================
-- TRACKING EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_events_submission_id ON tracking_events(submission_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Agents: users can only access their own record
CREATE POLICY "Agents can manage own record"
  ON agents
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policies: agents can only access their own policies
CREATE POLICY "Agents can manage own policies"
  ON policies
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Clients: agents can only access their own clients
CREATE POLICY "Agents can manage own clients"
  ON clients
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Dependents: agents can only access dependents of their clients
CREATE POLICY "Agents can manage own dependents"
  ON dependents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = dependents.client_id
      AND clients.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = dependents.client_id
      AND clients.agent_id = auth.uid()
    )
  );

-- Templates: agents can only access their own templates
CREATE POLICY "Agents can manage own templates"
  ON templates
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Form submissions: agents can only access their own submissions
CREATE POLICY "Agents can manage own form submissions"
  ON form_submissions
  FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Tracking events: agents can only access events for their own submissions
CREATE POLICY "Agents can manage own tracking events"
  ON tracking_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM form_submissions
      WHERE form_submissions.id = tracking_events.submission_id
      AND form_submissions.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_submissions
      WHERE form_submissions.id = tracking_events.submission_id
      AND form_submissions.agent_id = auth.uid()
    )
  );

-- =====================================================
-- NEW USER HANDLER (auto-create agent record)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agents (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
