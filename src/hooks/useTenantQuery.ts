import { useTenant } from '@/contexts/TenantContext';

/**
 * Hook that returns tenant_id for use in Supabase queries.
 * All data queries should filter by this tenant_id.
 */
export const useTenantId = () => {
  const { tenantId } = useTenant();
  return tenantId;
};
