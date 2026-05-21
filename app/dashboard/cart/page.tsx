"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ShoppingCart, Trash2,
  Plus, Minus, ArrowLeft, Package, ChevronRight
} from "lucide-react";
import Link from "next/link";

type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
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

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCart();
  }, [user]);

  async function fetchCart() {
    setLoadingCart(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setCartItems(data as CartItem[]);
    setLoadingCart(false);
  }

  async function updateQty(item: CartItem, delta: number) {
    const newQty = item.quantity + delta;
    setUpdatingId(item.id);
    try {
      if (newQty <= 0) {
        await supabase.from("cart_items").delete().eq("id", item.id);
        setCartItems((prev) => prev.filter((c) => c.id !== item.id));
      } else if (newQty > item.products.stock) {
        alert("Melebihi stok tersedia!");
      } else {
        await supabase.from("cart_items").update({ quantity: newQty }).eq("id", item.id);
        setCartItems((prev) => prev.map((c) => c.id === item.id ? { ...c, quantity: newQty } : c));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(id: string) {
    setUpdatingId(id);
    await supabase.from("cart_items").delete().eq("id", id);
    setCartItems((prev) => prev.filter((c) => c.id !== id));
    setUpdatingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (p: CartItem["products"]) =>
    p.thumbnail || p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=300&background=0f172a&color=f97316&bold=true`;
  const getLine = (p: CartItem["products"]) => p.line || p.brand || "-";

  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const shipping = subtotal > 0 ? 25000 : 0;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('/image_6.png')" }} />
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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Shopping Cart</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[130px]">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all text-[10px] uppercase tracking-widest font-bold font-mono rounded"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">

          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Toko
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              Shopping <span className="text-orange-500">Cart</span>
            </h2>
            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-mono">
              {cartItems.length} item
            </span>
          </div>

          {loadingCart ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <ShoppingCart className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 font-mono text-sm">Cart kamu masih kosong</p>
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded transition-all"
              >
                <Package className="w-3.5 h-3.5" />
                Lihat Produk
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="relative bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex gap-4 items-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 rounded-tl-xl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 rounded-br-xl" />

                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
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
                      <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">{getLine(item.products)}</p>
                      <p className="text-white font-bold text-sm truncate">{item.products.name}</p>
                      <p className="text-orange-400 font-black text-sm">
                        Rp {Number(item.products.price).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(item, -1)}
                        disabled={updatingId === item.id}
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded flex items-center justify-center text-white transition-colors disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-white font-mono text-sm font-bold">
                        {updatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item, 1)}
                        disabled={updatingId === item.id || item.quantity >= item.products.stock}
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded flex items-center justify-center text-white transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-white font-black text-sm">
                        Rp {(Number(item.products.price) * item.quantity).toLocaleString("id-ID")}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updatingId === item.id}
                        className="mt-1 text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="relative bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 sticky top-24">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 rounded-tl-xl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 rounded-br-xl" />

                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-mono mb-4">Ringkasan Pesanan</p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-mono">Subtotal</span>
                      <span className="text-white font-bold">Rp {subtotal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-mono">Ongkir</span>
                      <span className="text-white font-bold">Rp {shipping.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between">
                      <span className="text-white font-black uppercase tracking-widest text-xs">Total</span>
                      <span className="text-orange-400 font-black text-base">Rp {total.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/checkout"
                    className="mt-5 w-full bg-orange-600 hover:bg-orange-500 text-black font-black text-[11px] uppercase tracking-widest py-3 rounded flex items-center justify-center gap-2 transition-all"
                  >
                    Lanjut Checkout
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/dashboard"
                    className="mt-2 w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest py-2.5 rounded flex items-center justify-center gap-2 transition-all"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Lanjut Belanja
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}