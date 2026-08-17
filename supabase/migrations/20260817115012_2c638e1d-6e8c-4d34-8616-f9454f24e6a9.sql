REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;