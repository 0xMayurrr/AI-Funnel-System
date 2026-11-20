-- Up migration: Client change requests and agency-managed DFY workflows
CREATE TABLE IF NOT EXISTS client_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('landing_page', 'funnel_questions', 'ai_channels', 'qualification_criteria', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_change_requests_workspace ON client_change_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON client_change_requests(status);

ALTER TABLE client_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces view own change requests"
  ON client_change_requests FOR SELECT
  USING (
    workspace_id = auth_workspace_id() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE profile_id = auth.uid())
  );

CREATE POLICY "Workspaces create change requests"
  ON client_change_requests FOR INSERT
  WITH CHECK (
    workspace_id = auth_workspace_id()
  );

CREATE POLICY "Admins update change requests"
  ON client_change_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE profile_id = auth.uid())
  );
