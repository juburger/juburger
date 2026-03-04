import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller: service role key, admin secret, or authenticated admin
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = apikeyHeader === serviceRoleKey || authHeader === `Bearer ${serviceRoleKey}`;
    const adminSecret = req.headers.get("x-admin-secret");
    const isAdminSecret = adminSecret === serviceRoleKey;
    
    if (!isServiceRole && !isAdminSecret) {
      if (!authHeader) throw new Error("Yetkilendirme gerekli");

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !caller) throw new Error("Geçersiz oturum");

      const { data: callerRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!callerRole) throw new Error("Yönetici yetkisi gerekli");
    }

    const { email, password, tenant_id } = await req.json();
    if (!email || !password || !tenant_id) {
      throw new Error("email, password ve tenant_id zorunlu");
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw new Error("Kullanıcı oluşturulamadı: " + createError.message);

    const userId = newUser.user.id;

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) throw new Error("Rol atanamadı: " + roleError.message);

    // Add tenant_users entry
    const { error: tenantError } = await supabaseAdmin
      .from("tenant_users")
      .insert({ user_id: userId, tenant_id, role: "admin", email });

    if (tenantError) throw new Error("İşletme bağlantısı kurulamadı: " + tenantError.message);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
