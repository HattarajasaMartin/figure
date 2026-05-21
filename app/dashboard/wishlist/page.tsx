"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft, Heart,
  ShoppingCart, Star, Package, X, CheckCircle, Trash2
} from "lucide-react";
import Link from "next/link";

type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    slug: string;
    name: string;
    line: string;
    brand: string;
    price: number;
    image: string;
    thumbnail: string;
    rating: number;
    stock: number;
  };
};

export default function WishlistPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await fetchWishlist(user.id);
      setLoading(false);
    }
    init();
  }, []);

  async function fetchWishlist(userId: string) {
    const { data, error } = await supabase
      .from("wishlists")
      .select(`
        id,
        product_id,
        created_at,
        products (
          id, slug, name, line, brand, price, image, thumbnail, rating, stock
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Wishlist fetch error:", error);
      showToast("Gagal memuat wishlist", "error");
      return;
    }

    // Filter out items where products is null (produk dihapus)
    const valid = (data ?? []).filter((item: any) => item.products !== null);
    setItems(valid as any);
  }

  async function removeFromWishlist(wishlistId: string, productName: string) {
    setRemovingId(wishlistId);
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      setItems((prev) => prev.filter((i) => i.id !== wishlistId));
      showToast(`${productName} dihapus dari wishlist`);
    } catch (err) {
      console.error("Remove wishlist error:", err);
      showToast("Gagal menghapus dari wishlist", "error");
    } finally {
      setRemovingId(null);
    }
  }

  async function addToCart(item: WishlistItem) {
    const p = item.products;
    if (!user) return;
    if (p.stock === 0) { showToast("Stok habis!", "error"); return; }
    setAddingId(item.id);
    try {
      const { data: existing } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", p.id)
        .maybeSingle(); // pakai maybeSingle agar tidak error jika kosong

      if (existing) {
        if (existing.quantity >= p.stock) { showToast("Stok tidak cukup!", "error"); return; }
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: p.id, quantity: 1 });
      }
      showToast(`${p.name} ditambahkan ke cart! 🎉`);
    } catch (err) {
      console.error("Add to cart error:", err);
      showToast("Gagal menambahkan ke cart", "error");
    } finally {
      setAddingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (p: WishlistItem["products"]) =>
    p.thumbnail || p.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=300&background=0f172a&color=f97316&bold=true`;

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">

      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl
          ${toast.type === "success" ? "bg-zinc-900 border-green-500/50 text-green-400" : "bg-zinc-900 border-red-500/50 text-red-400"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          <p className="text-xs font-mono">{toast.message}</p>
        </div>
      )}

      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('/image_6.png')" }} />
      <div className="absolute inset-0 z-[1] bg-black/50" />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* NAVBAR */}
        <nav className="border-b border-zinc-800/80 bg-black/60 backdrop-blur-md px-6 py-3 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 bg-orange-500/10 border border-orange-500/50 flex items-center justify-center rounded">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-sm font-black italic uppercase tracking-tighter text-white leading-none">
                  QUANTUM <span className="text-orange-500">ARSENAL</span>
                </h1>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Wishlist</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[130px]">{user?.email}</p>
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
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">

          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dashboard
          </Link>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-red-500/10 via-transparent to-orange-500/10 border border-zinc-800 rounded-xl p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/60" />
            <div className="flex items-center gap-3 mb-1">
              <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              <p className="text-[10px] text-red-400 uppercase tracking-[0.5em] font-mono">Koleksi Impian</p>
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Wish<span className="text-red-400">list</span>
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-1">
              {items.length} item tersimpan
            </p>
          </div>

          {/* Isi wishlist */}
          {items.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Heart className="w-14 h-14 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 font-mono text-sm">Wishlist kamu masih kosong</p>
              <Link href="/dashboard/products"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded transition-all">
                <Package className="w-3.5 h-3.5" /> Jelajahi Produk
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => {
                const p = item.products;
                return (
                  <div key={item.id}
                    className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-all hover:bg-zinc-900/70">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-red-500/30 z-10" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-orange-500/30 z-10" />

                    {/* Tombol hapus */}
                    <button
                      onClick={() => removeFromWishlist(item.id, p.name)}
                      disabled={removingId === item.id}
                      className="absolute top-2 right-2 z-20 w-7 h-7 bg-black/60 border border-zinc-700 hover:border-red-500/50 hover:text-red-400 text-zinc-400 rounded-full flex items-center justify-center transition-all"
                    >
                      {removingId === item.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                    </button>

                    <Link href={`/products/${p.slug}`} className="block">
                      <div className="relative aspect-square overflow-hidden bg-zinc-950">
                        <img
                          src={getImage(p)}
                          alt={p.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${p.stock === 0 ? "opacity-40 grayscale" : "group-hover:scale-105"}`}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=300&background=0f172a&color=f97316&bold=true`;
                          }}
                        />
                        {p.stock === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <span className="text-[10px] bg-red-500/90 text-white px-2 py-1 rounded font-bold uppercase">Habis</span>
                          </div>
                        )}
                        {p.stock > 0 && p.stock <= 5 && (
                          <span className="absolute top-2 left-2 text-[8px] bg-yellow-500/80 text-black px-1.5 py-0.5 rounded font-bold uppercase z-10">
                            Stok Tipis
                          </span>
                        )}
                        <div className="absolute bottom-2 left-2 z-10">
                          <Heart className="w-4 h-4 text-red-400 fill-red-400 drop-shadow" />
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">{p.line || p.brand || "-"}</p>
                        <p className="text-white font-bold text-sm leading-tight line-clamp-2">{p.name}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] text-zinc-400 font-mono">{p.rating ?? "-"}</span>
                          </div>
                          <span className={`text-[9px] font-mono ${p.stock === 0 ? "text-red-400" : "text-zinc-600"}`}>
                            Stok: {p.stock}
                          </span>
                        </div>
                        <p className="text-orange-400 font-black text-sm">
                          Rp {Number(p.price).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </Link>

                    <button
                      onClick={() => addToCart(item)}
                      disabled={addingId === item.id || p.stock === 0}
                      className={`w-full font-black text-[10px] uppercase tracking-widest py-2 flex items-center justify-center gap-2 transition-all
                        ${p.stock === 0 ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-orange-600/80 hover:bg-orange-500 text-black"}`}
                    >
                      {addingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                      {p.stock === 0 ? "Habis" : addingId === item.id ? "Menambahkan..." : "Tambah ke Cart"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-zinc-900 pt-5">
            <p className="text-[9px] text-zinc-700 text-center uppercase tracking-[0.4em] font-mono">
              Quantum Arsenal — Figure Store v1.0.0
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}