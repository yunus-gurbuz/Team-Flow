CREATE OR REPLACE FUNCTION public.create_organization(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  INSERT INTO public.organizations (name, created_by)
  VALUES (btrim(_name), _uid)
  RETURNING id INTO _org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (_org_id, _uid, 'admin');

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;