import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from './useTenantQuery';

export interface TableInfo {
  id: string;
  table_num: number;
  slug: string;
  name: string;
  area_id: string | null;
  displayName: string;
}

export const useTableFromSlug = (slug: string) => {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['table-by-slug', tenantId, slug],
    queryFn: async (): Promise<TableInfo | null> => {
      if (!tenantId || !slug) return null;

      // Try slug first
      let { data } = await supabase
        .from('tables')
        .select('id, table_num, slug, name, area_id')
        .eq('tenant_id', tenantId)
        .eq('slug', slug as any)
        .eq('is_active', true)
        .maybeSingle();

      // Fallback: try as numeric table_num for backward compat
      if (!data) {
        const num = parseInt(slug);
        if (!isNaN(num)) {
          const res = await supabase
            .from('tables')
            .select('id, table_num, slug, name, area_id')
            .eq('tenant_id', tenantId)
            .eq('table_num', num)
            .eq('is_active', true)
            .maybeSingle();
          data = res.data;
        }
      }

      if (!data) return null;

      const t = data as any;

      // Get area name for display
      let displayName = t.name || `Masa ${t.table_num}`;
      if (t.area_id) {
        const { data: area } = await supabase
          .from('table_areas')
          .select('name')
          .eq('id', t.area_id)
          .maybeSingle();

        if (area) {
          // Get local index within area
          const { data: areaTables } = await supabase
            .from('tables')
            .select('id, table_num')
            .eq('tenant_id', tenantId)
            .eq('area_id', t.area_id)
            .eq('is_active', true)
            .order('table_num');

          const localIdx = (areaTables || []).findIndex((tb: any) => tb.id === t.id) + 1;
          displayName = `${area.name} ${localIdx}`;
        }
      }

      return {
        id: t.id,
        table_num: t.table_num,
        slug: t.slug || slug,
        name: t.name,
        area_id: t.area_id,
        displayName,
      };
    },
    enabled: !!tenantId && !!slug,
  });
};
