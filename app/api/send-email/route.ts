import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, orderData } = body;

    console.log("[send-email] Received request:", { to, hasOrderData: !!orderData });
    console.log("[send-email] API Key exists:", !!process.env.RESEND_API_KEY);

    // ✅ Validasi field 'to'
    if (!to || typeof to !== "string" || !to.includes("@")) {
      console.error("[send-email] Invalid 'to' field:", to);
      return NextResponse.json(
        { error: `Field 'to' tidak valid: "${to}"` },
        { status: 400 }
      );
    }

    // ✅ Validasi API key
    if (!process.env.RESEND_API_KEY) {
      console.error("[send-email] RESEND_API_KEY tidak ditemukan!");
      return NextResponse.json(
        { error: "RESEND_API_KEY tidak dikonfigurasi" },
        { status: 500 }
      );
    }

    // ✅ FIX: Selalu kirim ke email akun Resend kamu selama belum verifikasi domain
    // Ganti dengan targetEmail = to; setelah domain diverifikasi
    const targetEmail = "kosong594@gmail.com";

    console.log("[send-email] Target email:", targetEmail);

    const { data, error } = await resend.emails.send({
      from: "Quantum Arsenal <onboarding@resend.dev>",
      to: [targetEmail],
      subject: `✅ Konfirmasi Pesanan — Quantum Arsenal`,
      html: buildEmailTemplate(orderData),
    });

    if (error) {
      console.error("[send-email] Resend error:", JSON.stringify(error));
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log("[send-email] ✅ Email berhasil dikirim! ID:", data?.id);
    return NextResponse.json({ success: true, id: data?.id });

  } catch (err: any) {
    console.error("[send-email] Unexpected error:", err.message);
    return NextResponse.json(
      { error: "Internal server error: " + err.message },
      { status: 500 }
    );
  }
}

function buildEmailTemplate(orderData: any) {
  const { orderId, cartItems = [], shippingAddress = {} } = orderData ?? {};

  const total = cartItems.reduce(
    (sum: number, item: any) =>
      sum + (Number(item.products?.price) || 0) * (item.quantity || 1),
    0
  );

  const itemRows = cartItems.map((item: any) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#d4d4d8;font-size:13px;">
        ${item.products?.name ?? "Produk"}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;text-align:center;font-size:13px;">
        x${item.quantity}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #27272a;color:#f97316;text-align:right;font-size:13px;font-weight:bold;">
        Rp ${(Number(item.products?.price || 0) * item.quantity).toLocaleString("id-ID")}
      </td>
    </tr>
  `).join("");

  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a1a1a,#0f0f0f);padding:32px;border-bottom:1px solid #f97316;">
        <h1 style="margin:0;font-size:22px;font-weight:900;letter-spacing:-1px;color:#fff;">
          QUANTUM <span style="color:#f97316;">ARSENAL</span>
        </h1>
        <p style="margin:4px 0 0;font-size:10px;color:#71717a;letter-spacing:4px;text-transform:uppercase;">
          Figure Store
        </p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
          <span style="font-size:24px;">✅</span>
          <h2 style="margin:0;font-size:20px;color:#fff;font-weight:800;">Pesanan Berhasil!</h2>
        </div>

        <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">
          Terima kasih telah berbelanja di Quantum Arsenal.
        </p>
        ${orderId ? `
        <p style="color:#71717a;font-size:12px;font-family:monospace;margin:0 0 24px;">
          Order ID: <strong style="color:#f97316;">${orderId}</strong>
        </p>` : ""}

        <!-- Items -->
        <h3 style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:4px;margin:0 0 12px;">
          Detail Pesanan
        </h3>
        <table style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>

        <!-- Total -->
        <div style="text-align:right;margin-top:16px;padding-top:16px;border-top:1px solid #27272a;">
          <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:2px;">Total</span>
          <div style="font-size:22px;font-weight:900;color:#f97316;">
            Rp ${total.toLocaleString("id-ID")}
          </div>
        </div>

        <!-- Shipping -->
        <div style="margin-top:24px;padding:16px;background:#18181b;border-radius:8px;border:1px solid #27272a;">
          <h3 style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:4px;margin:0 0 10px;">
            Alamat Pengiriman
          </h3>
          <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:1.8;">
            <strong style="color:#fff;">${shippingAddress.name ?? ""}</strong><br/>
            ${shippingAddress.phone ?? ""}<br/>
            ${shippingAddress.address ?? ""}<br/>
            ${shippingAddress.city ?? ""}${shippingAddress.postal_code ? `, ${shippingAddress.postal_code}` : ""}
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;background:#0f0f0f;border-top:1px solid #27272a;text-align:center;">
        <p style="margin:0;font-size:10px;color:#52525b;text-transform:uppercase;letter-spacing:3px;">
          Quantum Arsenal — Figure Store v1.0.0
        </p>
      </div>
    </div>
  `;
}