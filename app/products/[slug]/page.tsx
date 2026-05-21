"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, ArrowLeft, Star, Heart,
  ShoppingCart, Loader2, CheckCircle, X, Package
} from "lucide-react";
import Link from "next/link";

type Product = {
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
  is_published: boolean;
};

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/50 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />Habis
    </span>
  );
  if (stock <= 5) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />Tipis · {stock}
    </span>
  );
  if (stock <= 20) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 border border-cyan-500/50 text-cyan-400">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />Stok · {stock}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-green-500/20 border border-green-500/50 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Ready · {stock}
    </span>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistingId, setWishlistingId] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Init user
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      setLoading(false);
    }
    init();
  }, []);

  // 2. Fetch product by slug + realtime stock
  useEffect(() => {
    if (!slug) return;

    async function fetchProduct() {
      setLoadingProduct(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();
      if (error || !data) {
        router.push("/dashboard");
        return;
      }
      setProduct(data);
      setLoadingProduct(false);
    }

    fetchProduct();

    // Realtime update stok & harga
    const channel = supabase
      .channel("product-detail-realtime")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          if (payload.new.slug === slug) {
            setProduct((prev) => prev ? { ...prev, ...payload.new as Product } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  // 3. Fetch wishlist & cart setelah user ready
  useEffect(() => {
    if (!user || !product) return;

    async function fetchUserData() {
      // Wishlist
      const { data: wishlist } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product!.id)
        .single();
      setIsWishlisted(!!wishlist);

      // Cart count
      const { data: cart } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id);
      if (cart) setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    }

    fetchUserData();
  }, [user, product]);

  async function toggleWishlist() {
    if (!user || !product) return;
    setWishlistingId(true);
    try {
      if (isWishlisted) {
        await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", product.id);
        setIsWishlisted(false);
        showToast("Dihapus dari wishlist");
      } else {
        await supabase.from("wishlists").insert({ user_id: user.id, product_id: product.id });
        setIsWishlisted(true);
        showToast("Ditambahkan ke wishlist! ❤️");
      }
    } catch {
      showToast("Gagal mengubah wishlist", "error");
    } finally {
      setWishlistingId(false);
    }
  }

  async function addToCart() {
    if (!user || !product) return;
    if (product.stock === 0) { showToast("Stok habis!", "error"); return; }
    setAddingToCart(true);
    try {
      const { data: existing } = await supabase
        .from("cart_items").select("*")
        .eq("user_id", user.id).eq("product_id", product.id).single();
      if (existing) {
        if (existing.quantity >= product.stock) { showToast("Stok tidak cukup!", "error"); return; }
        await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
      }
      setCartCount((prev) => prev + 1);
      showToast(`${product.name} ditambahkan ke cart! 🎉`);
    } catch {
      showToast("Gagal menambahkan ke cart", "error");
    } finally {
      setAddingToCart(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (p: Product) =>
    p.thumbnail || p.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=600&background=0f172a&color=f97316&bold=true`;

  if (loading || loadingProduct) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  if (!product) return null;

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">

      {/* Toast */}
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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Detail Produk</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/dashboard/cart" className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-black text-[8px] font-black rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
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
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-6">

          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Gambar */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60 z-10" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60 z-10" />
              <img
                src={getImage(product)}
                alt={product.name}
                className={`w-full h-full object-cover ${product.stock === 0 ? "opacity-40 grayscale" : ""}`}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=600&background=0f172a&color=f97316&bold=true`;
                }}
              />
              {product.stock === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <span className="text-sm bg-red-500/90 text-white px-4 py-2 rounded font-bold uppercase">Stok Habis</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-5">
              <div className="relative bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 border border-zinc-800 rounded-xl p-5">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-orange-500/60" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-500/60" />
                <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest mb-1">
                  {product.line || product.brand || "-"}
                </p>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"}`} />
                ))}
                <span className="text-xs text-zinc-400 font-mono ml-1">{product.rating ?? "-"} / 5</span>
              </div>

              {/* Stok */}
              <StockBadge stock={product.stock} />

              {/* Harga */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-4">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Harga</p>
                <p className="text-3xl font-black text-orange-400">
                  Rp {Number(product.price).toLocaleString("id-ID")}
                </p>
              </div>

              {/* Brand & Line */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg px-4 py-3">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Brand</p>
                  <p className="text-white font-bold text-sm">{product.brand || "-"}</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg px-4 py-3">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Seri / Line</p>
                  <p className="text-white font-bold text-sm">{product.line || "-"}</p>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistingId}
                  className={`p-3 border rounded-xl transition-all flex items-center justify-center
                    ${isWishlisted ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-zinc-700 text-zinc-500 hover:border-red-500/50 hover:text-red-400"}`}
                >
                  {wishlistingId
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500" : ""}`} />
                  }
                </button>

                <button
                  onClick={addToCart}
                  disabled={addingToCart || product.stock === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 font-black text-sm uppercase tracking-widest rounded-xl transition-all
                    ${product.stock === 0
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-500 text-black"}`}
                >
                  {addingToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {product.stock === 0 ? "Stok Habis" : addingToCart ? "Menambahkan..." : "Tambah ke Cart"}
                </button>
              </div>

              <Link
                href="/dashboard/cart"
                className="block w-full text-center py-3 border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 font-black text-sm uppercase tracking-widest rounded-xl transition-all"
              >
                Lihat Cart
              </Link>
            </div>
          </div>

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