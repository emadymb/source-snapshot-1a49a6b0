-- ============================================================================
-- Fiksu — Row Level Security & tenant-isolation functions
-- ============================================================================
-- The application connects as a normal (non-superuser) role and sets the
-- current user id per request:  SET LOCAL app.current_user_id = '<uuid>';
-- The helper functions below read that GUC and decide access. RLS policies use
-- them so a query can never reach another tenant's rows.
--
-- A BYPASSRLS "owner"/migration role (e.g. the default `fiksu` superuser in
-- docker-compose) can still run migrations and maintenance.
-- ============================================================================

-- Application role used at runtime (least privilege, RLS enforced).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fiksu_app') THEN
    CREATE ROLE fiksu_app LOGIN PASSWORD 'fiksu_app';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fiksu_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fiksu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fiksu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO fiksu_app;

-- ----------------------------------------------------------------------------
-- Current-user helper: reads the per-request GUC set by the app.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_app_user()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

-- ----------------------------------------------------------------------------
-- Is the current user a platform super admin? (bypasses tenant scoping)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role = 'SUPER_ADMIN' AND is_active
  )
$$;

-- ----------------------------------------------------------------------------
-- can_access_workspace(user_id, workspace_id)
-- True when the user is a super admin, the workspace owner, or a member.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _workspace_id AND w.owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id
    )
$$;

-- ----------------------------------------------------------------------------
-- can_access_company(user_id, company_id)
-- True when the user can access the workspace that owns the company.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id
      AND public.can_access_workspace(_user_id, c.workspace_id)
  )
$$;

-- ============================================================================
-- Enable RLS + policies
-- ============================================================================

-- users: a user sees themselves; super admins see everyone.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_self_or_admin ON public.users
  FOR SELECT USING (id = public.current_app_user() OR public.is_super_admin(public.current_app_user()));
CREATE POLICY users_update_self_or_admin ON public.users
  FOR UPDATE USING (id = public.current_app_user() OR public.is_super_admin(public.current_app_user()));
CREATE POLICY users_admin_write ON public.users
  FOR ALL USING (public.is_super_admin(public.current_app_user()))
  WITH CHECK (public.is_super_admin(public.current_app_user()));

-- sessions: only the owning user (or super admin) can touch their sessions.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY sessions_owner ON public.sessions
  FOR ALL USING (user_id = public.current_app_user() OR public.is_super_admin(public.current_app_user()))
  WITH CHECK (user_id = public.current_app_user() OR public.is_super_admin(public.current_app_user()));

-- workspaces: scoped by can_access_workspace.
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;
CREATE POLICY workspaces_access ON public.workspaces
  FOR SELECT USING (public.can_access_workspace(public.current_app_user(), id));
CREATE POLICY workspaces_admin_write ON public.workspaces
  FOR ALL USING (public.is_super_admin(public.current_app_user()) OR owner_id = public.current_app_user())
  WITH CHECK (public.is_super_admin(public.current_app_user()) OR owner_id = public.current_app_user());

-- companies: scoped by their workspace.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
CREATE POLICY companies_access ON public.companies
  FOR SELECT USING (public.can_access_workspace(public.current_app_user(), workspace_id));
CREATE POLICY companies_write ON public.companies
  FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id))
  WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

-- workspace_members: scoped by their workspace.
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;
CREATE POLICY members_access ON public.workspace_members
  FOR SELECT USING (public.can_access_workspace(public.current_app_user(), workspace_id));
CREATE POLICY members_write ON public.workspace_members
  FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id))
  WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

-- profiles: a user manages their own profile; super admins see all.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY profiles_self ON public.profiles
  FOR ALL USING (user_id = public.current_app_user() OR public.is_super_admin(public.current_app_user()))
  WITH CHECK (user_id = public.current_app_user() OR public.is_super_admin(public.current_app_user()));
