import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Verify caller is admin
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

    // Check admin role
    const { data: role } = await adminClient.from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: 'Admin yetkisi gerekli' }), { status: 403, headers: corsHeaders });
    }

    const { action, ...body } = await req.json();

    if (action === 'create') {
      const { name, username, password, pin, work_days, shift_start, shift_end } = body;
      if (!name || !username || !password) {
        return new Response(JSON.stringify({ error: 'Ad, kullanıcı adı ve şifre zorunlu' }), { status: 400, headers: corsHeaders });
      }

      const email = `${username}@staff.ju.local`;

      // Create auth user
      const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userError) {
        return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders });
      }

      // Add user role
      await adminClient.from('user_roles').insert({ user_id: userData.user.id, role: 'user' });

      // Create staff record
      const { error: staffError } = await adminClient.from('staff').insert({
        user_id: userData.user.id,
        name,
        username,
        pin: pin || '',
        work_days: work_days || ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
        shift_start: shift_start || '09:00',
        shift_end: shift_end || '23:00',
      });
      if (staffError) {
        return new Response(JSON.stringify({ error: staffError.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      const { staff_id, user_id } = body;
      if (user_id) {
        await adminClient.auth.admin.deleteUser(user_id);
      }
      await adminClient.from('staff').delete().eq('id', staff_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      const { staff_id, ...updates } = body;
      const { password, ...staffUpdates } = updates;
      
      if (Object.keys(staffUpdates).length > 0) {
        await adminClient.from('staff').update(staffUpdates).eq('id', staff_id);
      }

      if (password) {
        const { data: staff } = await adminClient.from('staff').select('user_id').eq('id', staff_id).single();
        if (staff?.user_id) {
          await adminClient.auth.admin.updateUserById(staff.user_id, { password });
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
