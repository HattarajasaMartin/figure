import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { cartItems, orderId, shippingAddress, userEmail } = await req.json();

  try {
    // Kurangi stock via RPC (bypass RLS)
    for (const item of cartItems) {
      const { error } = await supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        qty: item.quantity,
      });
      if (error) console.error("❌ Gagal update stock:", item.product_id, error);
    }

    // Hapus cart items setelah bayar
    const userId = cartItems[0]?.user_id;
    if (userId) {
      await supabase.from("cart_items").delete().eq("user_id", userId);
    }

    // ✅ Kirim email konfirmasi
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const emailRes = await fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          orderData: { orderId, cartItems, shippingAddress },
        }),
      });
      const emailData = await emailRes.json();
      console.log("[order-success] Email result:", emailData);
    } catch (emailErr) {
      console.error("[order-success] Gagal kirim email:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ order-success error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}