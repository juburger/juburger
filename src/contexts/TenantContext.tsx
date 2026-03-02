import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  primary_color: string;
  phone: string;
  address: string;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: null,
  loading: true,
  error: null,
});

export const useTenant = () => useContext(TenantContext);

/**
 * Resolves tenant slug from subdomain.
 * e.g. juburger.siparis.co → "juburger"
 * For preview/localhost, falls back to "juburger" (default tenant)
 */
function resolveSlug(): string {
  const hostname = window.location.hostname;

  // Production: slug.siparis.co
  if (hostname.endsWith('.siparis.co')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) return parts[0];
  }

  // Lovable preview: check for slug in subdomain pattern
  // e.g. juburger--xxxxx.lovable.app or similar
  // For now, check URL param as override for dev
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');
  if (tenantParam) return tenantParam;

  // Default fallback for dev/preview
  return 'juburger';
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Super admin routes don't need tenant resolution
  const location = useLocation();
  const isSuperAdmin = location.pathname.startsWith('/super-admin');

  useEffect(() => {
    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    const slug = resolveSlug();

    const fetchTenant = async () => {
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        setError('İşletme bilgileri yüklenemedi');
        console.error('Tenant fetch error:', fetchError);
      } else if (!data) {
        setError(`İşletme bulunamadı: ${slug}`);
      } else {
        setTenant(data as Tenant);
      }
      setLoading(false);
    };

    fetchTenant();
  }, [isSuperAdmin]);

  return (
    <TenantContext.Provider value={{ tenant, tenantId: tenant?.id || null, loading, error }}>
      {isSuperAdmin ? (
        children
      ) : loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-sm text-muted-foreground">Yükleniyor...</div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8">
            <div className="text-4xl mb-4">🚫</div>
            <h1 className="text-lg font-bold mb-2">İşletme Bulunamadı</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : (
        children
      )}
    </TenantContext.Provider>
  );
};
