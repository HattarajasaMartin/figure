"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft,
  CreditCard, MapPin, CheckCircle, X
} from "lucide-react";
import Link from "next/link";

type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
  user_id: string;
  products: {
    id: string;
    name: string;
    brand: string;
    line: string;
    price: number;
    image: string;
    thumbnail: string;
    stock: number;
  };
};

declare global {
  interface Window { snap: any; }
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    notes: "",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Midtrans Snap script
  useEffect(() => {
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!;

    const script = document.createElement("script");
    script.src = snapUrl;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // Realtime stock listener
  useEffect(() => {
    const channel = supabase
      .channel("stock-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          setCartItems((prev) =>
            prev.map((item) =>
              item.product_id === payload.new.id
                ? { ...item, products: { ...item.products, stock: payload.new.stock } }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Init user + cart
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUser(user);
      setUserEmail(user.email ?? "");

      const { data: cart } = await supabase
        .from("cart_items")
        .select("*, products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!cart || cart.length === 0) {
        router.push("/dashboard/cart");
        return;
      }
      setCartItems(cart as CartItem[]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setForm((f) => ({ ...f, name: profile.full_name }));

      setLoading(false);
    }
    init();
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const shipping = 25000;
  const total = subtotal + shipping;

  const getImage = (p: CartItem["products"]) =>
    p.thumbnail || p.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=100&background=0f172a&color=f97316&bold=true`;

  async function handleCheckout() {
    if (!form.name || !form.phone || !form.address || !form.city || !form.postal_code) {
      showToast("Lengkapi semua data pengiriman!", "error");
      return;
    }

    if (!userEmail) {
      showToast("Session expired, silakan login ulang", "error");
      router.push("/login");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems, shippingAddress: form }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        showToast(data.error || "Gagal memproses pesanan", "error");
        setProcessing(false);
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: async (result: any) => {
          console.log("✅ [onSuccess] Midtrans berhasil! Order ID:", result.order_id);

          // ✅ Kurangi stock + hapus cart via backend (bypass RLS)
          try {
            const orderRes = await fetch("/api/order-success", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cartItems,
                orderId: result.order_id,
                shippingAddress: form,
                userEmail,
              }),
            });
            if (!orderRes.ok) {
              console.error("❌ Gagal update stock/cart:", await orderRes.json());
            } else {
              console.log("✅ Stock & cart updated via backend");
            }
          } catch (err) {
            console.error("❌ order-success error:", err);
          }

          // ✅ Kirim email
          try {
            const emailRes = await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: userEmail,
                orderData: {
                  orderId: result.order_id,
                  cartItems,
                  shippingAddress: form,
                },
              }),
            });
            const emailJson = await emailRes.json();
            if (emailRes.ok) {
              console.log("✅ Email terkirim! Resend ID:", emailJson.id);
            } else {
              console.error("❌ Email gagal:", emailRes.status, emailJson);
            }
          } catch (emailErr) {
            console.error("❌ Email exception:", emailErr);
          }

          router.push("/dashboard/orders?success=1");
        },

        onPending: (result: any) => {
          console.log("⏳ [onPending]:", result);
          router.push("/dashboard/orders?pending=1");
        },

        onError: (result: any) => {
          console.error("❌ [onError] Pembayaran gagal:", result);
          showToast("Pembayaran gagal, silakan coba lagi", "error");
          setProcessing(false);
        },

        onClose: () => {
          console.log("🚪 [onClose] Popup ditutup");
          showToast("Kamu menutup popup pembayaran", "error");
          setProcessing(false);
        },
      });
    } catch (err) {
      console.error("❌ [handleCheckout] Error:", err);
      showToast("Terjadi kesalahan, coba lagi", "error");
      setProcessing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">

      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl transition-all
          ${toast.type === "success"
            ? "bg-zinc-900 border-green-500/50 text-green-400"
            : "bg-zinc-900 border-red-500/50 text-red-400"}`}>
          {toast.type === "success"
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <X className="w-4 h-4 shrink-0" />}
          <p className="text-xs font-mono">{toast.message}</p>
        </div>
      )}

      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/image_6.png')" }} />
      <div className="absolute inset-0 z-[1] bg-black/50" />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* NAVBAR */}
        <nav className="border-b border-zinc-800/80 bg-black/60 backdrop-blur-md px-6 py-3 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 bg-orange-500/10 border border-orange-500/50 flex items-center justify-center rounded">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-sm font-black italic uppercase tracking-tighter text-white leading-none">
                  QUANTUM <span className="text-orange-500">ARSENAL</span>
                </h1>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Checkout</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[130px]">{userEmail}</p>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all text-[10px] uppercase tracking-widest font-bold font-mono rounded">
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">

          <Link href="/dashboard/cart"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Cart
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Check<span className="text-orange-500">out</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Form Pengiriman */}
            <div className="lg:col-span-2">
              <div className="relative bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 rounded-br-xl" />

                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-mono">Alamat Pengiriman</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "name", label: "Nama Penerima", placeholder: "NAMA LU ", full: true },
                    { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx", full: false },
                    { key: "address", label: "Alamat Lengkap", placeholder: "Jl. Merdeka No. 1, Kec. ...", full: true },
                    { key: "city", label: "Kota", placeholder: "Jakarta", full: false },
                    { key: "postal_code", label: "Kode Pos", placeholder: "12345", full: false },
                    { key: "notes", label: "Catatan (opsional)", placeholder: "Titip di depan pintu...", full: true },
                  ].map((field) => (
                    <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
                      <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono block mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-zinc-950/60 border border-zinc-700 focus:border-orange-500/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="relative bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 sticky top-24 space-y-4">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 rounded-br-xl" />

                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-mono">Ringkasan Pesanan</p>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded overflow-hidden bg-zinc-950 shrink-0">
                        <img
                          src={getImage(item.products)}
                          alt={item.products.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.products.name)}&size=100&background=0f172a&color=f97316&bold=true`;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-bold truncate">{item.products.name}</p>
                        <p className="text-[9px] text-zinc-500 font-mono">x{item.quantity}</p>
                      </div>
                      <p className="text-[10px] text-orange-400 font-black shrink-0">
                        Rp {(Number(item.products.price) * item.quantity).toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-zinc-800 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-mono text-xs">Subtotal</span>
                    <span className="text-white font-bold text-xs">Rp {subtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-mono text-xs">Ongkir</span>
                    <span className="text-white font-bold text-xs">Rp {shipping.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 flex justify-between">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Total</span>
                    <span className="text-orange-400 font-black">Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-black font-black text-[11px] uppercase tracking-widest py-3 rounded flex items-center justify-center gap-2 transition-all"
                >
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                    : <><CreditCard className="w-4 h-4" /> Bayar Sekarang</>}
                </button>

                <p className="text-[9px] text-zinc-600 text-center font-mono">
                  Pembayaran aman via Midtrans 🔒
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-5 mt-8">
            <p className="text-[9px] text-zinc-700 text-center uppercase tracking-[0.4em] font-mono">
              Quantum Arsenal — Figure Store v1.0.0
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}