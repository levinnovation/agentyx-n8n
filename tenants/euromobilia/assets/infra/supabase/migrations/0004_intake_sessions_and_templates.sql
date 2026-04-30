-- Migration 0004: intake_sessions and intake_templates
-- Adds state-machine tables for WhatsApp interactive intake forms.

CREATE TABLE IF NOT EXISTS intake_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  definition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  template_slug TEXT NOT NULL REFERENCES intake_templates(slug),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','cancelled','expired')),
  current_step TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_intake_active_per_phone
  ON intake_sessions(phone_number) WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_intake_sessions_phone
  ON intake_sessions(phone_number, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_intake_sessions_conv
  ON intake_sessions(conversation_id, started_at DESC);

ALTER TABLE intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_templates ENABLE ROW LEVEL SECURITY;

-- Updated trigger for intake_sessions
CREATE OR REPLACE FUNCTION update_intake_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intake_sessions_updated_at ON intake_sessions;
CREATE TRIGGER trg_intake_sessions_updated_at
  BEFORE UPDATE ON intake_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_intake_sessions_updated_at();

-- Updated trigger for intake_templates
CREATE OR REPLACE FUNCTION update_intake_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intake_templates_updated_at ON intake_templates;
CREATE TRIGGER trg_intake_templates_updated_at
  BEFORE UPDATE ON intake_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_intake_templates_updated_at();
