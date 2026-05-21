import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { cartItems, shippingAddress } = body;

    if (!cartItems || cartItems.length === 0)
      return NextResponse.json({ error: "Cart kosong" }, { status: 400 });

    const subtotal = cartItems.reduce((sum: number, item: any) =>
      sum + Number(item.products.price) * item.quantity, 0);
    const shipping = 25000;
    const total = subtotal + shipping;

    const orderId = `QA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Buat order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        total,
        midtrans_order_id: orderId,
        shipping_address: shippingAddress,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order error:", orderError);
      return NextResponse.json({ error: "Gagal membuat order" }, { status: 500 });
    }

    // Buat order_items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.products.price,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Kurangi stok
    for (const item of cartItems) {
      await supabase.rpc("decrement_stock", {
        p_id: item.product_id,
        p_qty: item.quantity,
      });
    }

    // Generate Midtrans token
    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY!;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: total,
      },
      // Tambahan callbacks
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/finish`,
      },
      customer_details: {
        email: user.email,
        first_name: shippingAddress.name,
        phone: shippingAddress.phone,
        shipping_address: {
          first_name: shippingAddress.name,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
        },
      },
      item_details: [
        ...cartItems.map((item: any) => ({
          id: item.product_id,
          name: item.products.name.slice(0, 50),
          price: Number(item.products.price),
          quantity: item.quantity,
        })),
        {
          id: "SHIPPING",
          name: "Ongkos Kirim",
          price: shipping,
          quantity: 1,
        },
      ],
    };

    const midtransRes = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(midtransServerKey + ":").toString("base64")}`,
      },
      body: JSON.stringify(midtransPayload),
    });

    const midtransData = await midtransRes.json();
    console.log("Midtrans response:", midtransData);

    if (!midtransData.token)
      return NextResponse.json({ error: "Gagal generate token Midtrans" }, { status: 500 });

    // Simpan token ke order
    await supabase
      .from("orders")
      .update({ midtrans_token: midtransData.token })
      .eq("id", order.id);

    // Hapus cart
    await supabase.from("cart_items").delete().eq("user_id", user.id);

    return NextResponse.json({
      token: midtransData.token,
      orderId: order.id,
      midtransOrderId: orderId,
    });

  } catch (err) {
    console.error("Midtrans route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}