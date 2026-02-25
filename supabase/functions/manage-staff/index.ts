import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation helpers
const VALID_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const TIME_RE = /^\d{2}:\d{2}$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{2,50}$/;
const PIN_RE = /^\d{4,6}$/;

function validateString(val: unknown, field: string, min = 1, max = 100): string {
  if (typeof val !== 'string') throw new Error(`${field} metin olmalı`);
  const trimmed = val.trim();
  if (trimmed.length < min) throw new Error(`${field} en az ${min} karakter olmalı`);
  if (trimmed.length > max) throw new Error(`${field} en fazla ${max} karakter olmalı`);
  return trimmed;
}

function validatePin(val: unknown): string {
  if (val === undefined || val === null || val === '') return '';
  const s = String(val).trim();
  if (!PIN_RE.test(s)) throw new Error('Pin kodu 4-6 haneli rakam olmalı');
  return s;
}

function validateWorkDays(val: unknown): string[] {
  if (!Array.isArray(val) || val.length === 0) throw new Error('En az 1 mesai günü seçilmeli');
  const filtered = val.filter(d => VALID_DAYS.includes(d));
  if (filtered.length === 0) throw new Error('Geçersiz mesai günleri');
  return filtered;
}

function validateTime(val: unknown, field: string): string {
  if (typeof val !== 'string' || !TIME_RE.test(val)) throw new Error(`${field} geçerli saat formatında olmalı (HH:MM)`);
  return val;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: role } = await adminClient.from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: 'Admin yetkisi gerekli' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'create') {
      const name = validateString(body.name, 'Ad');
      const username = validateString(body.username, 'Kullanıcı adı', 2, 50);
      if (!USERNAME_RE.test(username)) throw new Error('Kullanıcı adı sadece harf, rakam ve _ içerebilir');
      const password = validateString(body.password, 'Şifre', 6, 100);
      const pin = validatePin(body.pin);
      const work_days = body.work_days ? validateWorkDays(body.work_days) : ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
      const shift_start = body.shift_start ? validateTime(body.shift_start, 'İşbaşı saati') : '09:00';
      const shift_end = body.shift_end ? validateTime(body.shift_end, 'İş sonu saati') : '23:00';

      const email = `${username}@staff.ju.local`;

      const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userError) {
        return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders });
      }

      await adminClient.from('user_roles').insert({ user_id: userData.user.id, role: 'user' });

      // Hash PIN via DB function
      const hashedPin = pin ? (await adminClient.rpc('hash_pin', { plain_pin: pin })).data || '' : '';

      const { error: staffError } = await adminClient.from('staff').insert({
        user_id: userData.user.id,
        name,
        username,
        pin: hashedPin,
        work_days,
        shift_start,
        shift_end,
      });
      if (staffError) {
        return new Response(JSON.stringify({ error: staffError.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      const { staff_id, user_id } = body;
      if (typeof staff_id !== 'string') throw new Error('staff_id gerekli');
      if (user_id && typeof user_id === 'string') {
        await adminClient.auth.admin.deleteUser(user_id);
      }
      await adminClient.from('staff').delete().eq('id', staff_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      const { staff_id, permissions, password, ...staffUpdates } = body;
      if (typeof staff_id !== 'string') throw new Error('staff_id gerekli');
      
      // Validate and filter staff fields
      const filtered: Record<string, unknown> = {};
      if (staffUpdates.name !== undefined) filtered.name = validateString(staffUpdates.name, 'Ad');
      if (staffUpdates.pin !== undefined) {
        const plainPin = validatePin(staffUpdates.pin);
        filtered.pin = plainPin ? (await adminClient.rpc('hash_pin', { plain_pin: plainPin })).data || '' : '';
      }
      if (staffUpdates.work_days !== undefined) filtered.work_days = validateWorkDays(staffUpdates.work_days);
      if (staffUpdates.shift_start !== undefined) filtered.shift_start = validateTime(staffUpdates.shift_start, 'İşbaşı saati');
      if (staffUpdates.shift_end !== undefined) filtered.shift_end = validateTime(staffUpdates.shift_end, 'İş sonu saati');

      if (Object.keys(filtered).length > 0) {
        await adminClient.from('staff').update(filtered).eq('id', staff_id);
      }

      // Update password
      if (password && typeof password === 'string') {
        validateString(password, 'Şifre', 6, 100);
        const { data: staff } = await adminClient.from('staff').select('user_id').eq('id', staff_id).single();
        if (staff?.user_id) {
          await adminClient.auth.admin.updateUserById(staff.user_id, { password });
        }
      }

      // Update permissions
      if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
        await adminClient.from('staff_permissions').delete().eq('staff_id', staff_id);
        const rows = Object.entries(permissions)
          .filter(([key]) => typeof key === 'string' && key.length <= 50)
          .map(([perm_key, enabled]) => ({
            staff_id,
            perm_key,
            enabled: !!enabled,
          }));
        if (rows.length > 0) {
          await adminClient.from('staff_permissions').insert(rows);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify_pin') {
      const { staff_id, pin } = body;
      if (typeof staff_id !== 'string') throw new Error('staff_id gerekli');
      const plainPin = validatePin(pin);
      const { data: isValid } = await adminClient.rpc('verify_pin', { p_staff_id: staff_id, plain_pin: plainPin });
      return new Response(JSON.stringify({ valid: !!isValid }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
