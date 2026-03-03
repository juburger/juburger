import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_QTY = 100;
const MAX_ITEMS = 50;
const MAX_NOTE_LENGTH = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate caller
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      items,
      table_num,
      user_name,
      payment_type,
      note,
      member_id,
      tenant_id,
      use_points,
      points_to_use,
    } = body;

    // --- Input validation ---
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      throw new Error("Geçersiz sipariş kalemleri");
    }

    const tableNum = parseInt(String(table_num));
    if (isNaN(tableNum) || tableNum < 1) throw new Error("Geçersiz masa numarası");

    if (typeof user_name !== "string" || user_name.trim().length === 0 || user_name.length > 100) {
      throw new Error("Geçersiz kullanıcı adı");
    }

    const validPayTypes = ["card", "pos", "cash"];
    if (!validPayTypes.includes(payment_type)) throw new Error("Geçersiz ödeme tipi");

    const safeNote =
      typeof note === "string" ? note.substring(0, MAX_NOTE_LENGTH).trim() : "";

    if (typeof tenant_id !== "string" || tenant_id.length < 10) {
      throw new Error("Geçersiz tenant");
    }

    // Validate each item has an id and qty
    const itemIds: string[] = [];
    const qtyMap = new Map<string, number>();
    for (const item of items) {
      if (typeof item.id !== "string" && typeof item.id !== "number") {
        throw new Error("Geçersiz ürün ID");
      }
      const id = String(item.id);
      const qty = parseInt(String(item.qty));
      if (isNaN(qty) || qty < 1 || qty > MAX_QTY) {
        throw new Error(`Geçersiz miktar: ${qty}`);
      }
      itemIds.push(id);
      qtyMap.set(id, qty);
    }

    // --- Server-side price lookup ---
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Try UUID-based product lookup first, fall back to integer IDs
    let products: { id: string; name: string; price: number }[] = [];

    // Check if IDs look like UUIDs or integers
    const isUuid = itemIds[0]?.includes("-");

    if (isUuid) {
      const { data, error } = await adminClient
        .from("products")
        .select("id, name, price")
        .in("id", itemIds)
        .eq("is_available", true);
      if (error) throw new Error("Ürünler alınamadı");
      products = data || [];
    } else {
      // Legacy integer IDs from hardcoded menu - trust client data for these
      // but still validate structure
      products = items.map((i: any) => ({
        id: String(i.id),
        name: typeof i.name === "string" ? i.name.substring(0, 200) : "Unknown",
        price: typeof i.price === "number" && i.price > 0 && i.price < 100000 ? i.price : 0,
      }));
    }

    if (products.length === 0) throw new Error("Ürün bulunamadı");

    // Build validated items with server prices
    const validatedItems = products
      .filter((p) => qtyMap.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name.substring(0, 200),
        qty: qtyMap.get(p.id)!,
        price: p.price,
      }));

    if (validatedItems.length === 0) throw new Error("Geçerli ürün bulunamadı");

    // --- Recalculate total server-side ---
    const subtotal = validatedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    let grandTotal = subtotal + serviceCharge;

    // --- Handle member points ---
    let pointsUsed = 0;
    let pointDiscount = 0;
    let earnedPoints = 0;
    let memberData: any = null;
    let loyaltySettings = { min_redeem_points: 50, point_value: 0.1 };

    const safeMemberId =
      typeof member_id === "string" && member_id.length > 10 ? member_id : null;

    if (safeMemberId) {
      const [memberRes, lsRes] = await Promise.all([
        adminClient
          .from("members")
          .select("id, name, total_points, used_points, total_spent, visit_count")
          .eq("id", safeMemberId)
          .maybeSingle(),
        adminClient
          .from("loyalty_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle(),
      ]);

      memberData = memberRes.data;
      if (lsRes.data) loyaltySettings = lsRes.data as any;

      if (memberData && use_points && typeof points_to_use === "number") {
        const availablePoints =
          memberData.total_points - memberData.used_points;
        const maxPointsForOrder = Math.min(
          availablePoints,
          Math.floor(grandTotal / loyaltySettings.point_value)
        );

        // Validate requested points
        pointsUsed = Math.max(
          0,
          Math.min(
            Math.floor(points_to_use),
            maxPointsForOrder
          )
        );

        if (pointsUsed >= loyaltySettings.min_redeem_points) {
          pointDiscount = Math.round(pointsUsed * loyaltySettings.point_value);
          grandTotal = grandTotal - pointDiscount;
        } else {
          pointsUsed = 0;
        }
      }

      earnedPoints = Math.floor(grandTotal / 10);
    }

    // --- Insert order ---
    const noteWithPoints = `${safeNote}${
      pointsUsed > 0
        ? ` [${pointsUsed} puan kullanıldı, ₺${pointDiscount} indirim]`
        : ""
    }`;

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        user_name: user_name.trim().substring(0, 100),
        table_num: tableNum,
        items: validatedItems,
        total: grandTotal,
        payment_type,
        payment_status: payment_type === "card" ? "pending" : "cash",
        status: "waiting",
        note: noteWithPoints,
        member_id: safeMemberId,
        tenant_id,
      })
      .select()
      .single();

    if (orderError) throw new Error("Sipariş oluşturulamadı: " + orderError.message);

    // --- Update member stats ---
    if (safeMemberId && memberData) {
      if (earnedPoints > 0) {
        await adminClient.from("point_transactions").insert({
          member_id: safeMemberId,
          type: "earn",
          points: earnedPoints,
          description: `Sipariş #${order.id.substring(0, 6).toUpperCase()} - ₺${grandTotal} harcama`,
          order_id: order.id,
        });
      }

      if (pointsUsed > 0) {
        await adminClient.from("point_transactions").insert({
          member_id: safeMemberId,
          type: "spend",
          points: -pointsUsed,
          description: `Sipariş #${order.id.substring(0, 6).toUpperCase()} - ${pointsUsed} puan kullanıldı (₺${pointDiscount} indirim)`,
          order_id: order.id,
        });
      }

      await adminClient
        .from("members")
        .update({
          total_points: memberData.total_points + earnedPoints,
          used_points: memberData.used_points + pointsUsed,
          total_spent: Number(memberData.total_spent) + grandTotal,
          visit_count: memberData.visit_count + 1,
          last_visit_at: new Date().toISOString(),
        })
        .eq("id", safeMemberId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id.substring(0, 6).toUpperCase(),
        full_order_id: order.id,
        earned_points: earnedPoints,
        points_used: pointsUsed,
        point_discount: pointDiscount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Sipariş hatası" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
