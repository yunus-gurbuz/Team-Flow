import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Org = { id: string; name: string; role: "admin" | "member" };

type OrgContextValue = {
  orgs: Org[];
  org: Org | null;
  setOrgId: (id: string) => void;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);
const STORAGE_KEY = "teamflow.org";

export function useMyOrgsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-orgs", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await supabase
        .from("org_members")
        .select("role, organizations(id, name)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => row.organizations)
        .map((row) => ({
          id: row.organizations!.id,
          name: row.organizations!.name,
          role: row.role as "admin" | "member",
        }));
    },
  });
}

export function OrgProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: orgs = [], isLoading } = useMyOrgsQuery(userId);
  const [orgId, setOrgIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && orgId === null) {
      setOrgIdState(window.localStorage.getItem(STORAGE_KEY));
    }
  }, [orgId]);

  const setOrgId = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setOrgIdState(id);
  };

  const org = useMemo(() => {
    if (!orgs.length) return null;
    return orgs.find((o) => o.id === orgId) ?? orgs[0]!;
  }, [orgs, orgId]);

  const value: OrgContextValue = {
    orgs,
    org,
    setOrgId,
    isAdmin: org?.role === "admin",
    loading: isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["my-orgs"] }),
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside OrgProvider");
  return ctx;
}
