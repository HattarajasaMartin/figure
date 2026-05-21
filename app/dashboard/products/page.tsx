"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft, Search,
  ShoppingCart, Star, Package, X, CheckCircle,
  SlidersHorizontal, ChevronDown
} from "lucide-react";
import Link from "next/link";

type Figure = {
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

const SORT_OPTIONS = [
  { value: "newest",    label: "Terbaru" },
  { value: "price_asc", label: "Harga Termurah" },
  { value: "price_desc",label: "Harga Termahal" },
  { value: "rating",    label: "Rating Tertinggi" },
  { value: "stock",     label: "Stok Terbanyak" },
];

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/50 text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
        Habis
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
        Tipis · {stock}
      </span>
    );
  }
  if (stock <= 20) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 border border-cyan-500/50 text-cyan-400">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
        Stok · {stock}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-green-500/20 border border-green-500/50 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      Ready · {stock}
    </span>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loadingFigures, setLoadingFigures] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [cartCount, setCartCount] = useState(0);
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
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchFigures() {
      setLoadingFigures(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!error && data) setFigures(data);
      setLoadingFigures(false);
    }
    fetchFigures();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function fetchCartCount() {
      const { data } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id);
      if (data) setCartCount(data.reduce((sum, item) => sum + item.quantity, 0));
    }
    fetchCartCount();
  }, [user]);

  async function addToCart(figure: Figure) {
    if (!user) return;
    if (figure.stock === 0) { showToast("Stok habis!", "error"); return; }
    setAddingId(figure.id);
    try {
      const { data: existing } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", figure.id)
        .single();

      if (existing) {
        if (existing.quantity >= figure.stock) { showToast("Stok tidak cukup!", "error"); return; }
        await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: figure.id, quantity: 1 });
      }
      setCartCount((prev) => prev + 1);
      showToast(`${figure.name} ditambahkan ke cart! 🎉`);
    } catch {
      showToast("Gagal menambahkan ke cart", "error");
    } finally {
      setAddingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (f: Figure) =>
    f.thumbnail || f.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&size=300&background=0f172a&color=f97316&bold=true`;

  const getLine = (f: Figure) => f.line || f.brand || "-";

  const brands = ["all", ...Array.from(new Set(figures.map(f => f.brand || f.line).filter(Boolean)))];

  const filtered = figures
    .filter((f) => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
        getLine(f).toLowerCase().includes(search.toLowerCase());
      const matchBrand = filterBrand === "all" || f.brand === filterBrand || f.line === filterBrand;
      const matchStock = filterStock === "all" ||
        (filterStock === "available" && f.stock > 0) ||
        (filterStock === "empty" && f.stock === 0);
      return matchSearch && matchBrand && matchStock;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc")  return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating")     return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === "stock")      return b.stock - a.stock;
      return 0;
    });

  const activeFilters = (filterBrand !== "all" ? 1 : 0) + (filterStock !== "all" ? 1 : 0);

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Semua Produk</p>
              </div>
            </Link>

            {/* Search desktop */}
            <div className="flex-1 max-w-md hidden md:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari figure, brand, atau seri..."
                className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-full font-mono"
              />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-zinc-500 hover:text-white" /></button>}
            </div>

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
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">

          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Dashboard
          </Link>

          {/* Header */}
          <div className="relative bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 border border-zinc-800 rounded-xl p-6">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/60" />
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.5em] font-mono mb-1">Koleksi Lengkap</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Semua <span className="text-orange-500">Produk</span>
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-1">
              {figures.length} produk tersedia · menampilkan {filtered.length} hasil
            </p>
          </div>

          {/* Search mobile */}
          <div className="flex md:hidden items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari figure..."
              className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-full font-mono"
            />
            {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-zinc-500" /></button>}
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-zinc-900/60 border border-zinc-800 text-white text-[10px] font-mono uppercase tracking-widest px-3 py-2 pr-7 rounded-lg outline-none cursor-pointer hover:border-zinc-600 transition-colors"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all
                ${showFilter || activeFilters > 0 ? "border-orange-500/50 text-orange-400 bg-orange-500/10" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeFilters > 0 && (
                <span className="w-4 h-4 bg-orange-500 text-black text-[8px] font-black rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>

            {(activeFilters > 0 || search) && (
              <button
                onClick={() => { setFilterBrand("all"); setFilterStock("all"); setSearch(""); }}
                className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-red-400 font-mono transition-colors"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}

            <p className="ml-auto text-[10px] text-zinc-600 font-mono">{filtered.length} produk</p>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Brand / Seri</p>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((b) => (
                      <button key={b} onClick={() => setFilterBrand(b)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-all
                          ${filterBrand === b ? "border-orange-500/50 text-orange-400 bg-orange-500/10" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                        {b === "all" ? "Semua" : b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-2">Ketersediaan</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "all", label: "Semua" },
                      { value: "available", label: "Tersedia" },
                      { value: "empty", label: "Habis" },
                    ].map((o) => (
                      <button key={o.value} onClick={() => setFilterStock(o.value)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-widest border transition-all
                          ${filterStock === o.value ? "border-orange-500/50 text-orange-400 bg-orange-500/10" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid Produk */}
          {loadingFigures ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Package className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 font-mono text-sm">Tidak ada produk ditemukan</p>
              <button onClick={() => { setFilterBrand("all"); setFilterStock("all"); setSearch(""); }}
                className="text-[10px] text-orange-400 hover:text-orange-300 font-mono underline">
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((figure) => (
                <div key={figure.id}
                  className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-all hover:bg-zinc-900/70">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 z-10" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 z-10" />

                  <Link href={`/products/${figure.slug}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-zinc-950">
                      <img
                        src={getImage(figure)}
                        alt={figure.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${figure.stock === 0 ? "opacity-40 grayscale" : "group-hover:scale-105"}`}
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(figure.name)}&size=300&background=0f172a&color=f97316&bold=true`;
                        }}
                      />
                      {figure.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-[10px] bg-red-500/90 text-white px-2 py-1 rounded font-bold uppercase">Habis</span>
                        </div>
                      )}
                      {/* Badge Stok Tipis di image dihapus, sudah ada di StockBadge bawah */}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">{getLine(figure)}</p>
                      <p className="text-white font-bold text-sm leading-tight line-clamp-2">{figure.name}</p>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-zinc-400 font-mono">{figure.rating ?? "-"}</span>
                      </div>

                      {/* Stock Badge — INI YANG DIPERBARUI */}
                      <StockBadge stock={figure.stock} />

                      <p className="text-orange-400 font-black text-sm pt-0.5">
                        Rp {Number(figure.price).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </Link>

                  <button
                    onClick={() => addToCart(figure)}
                    disabled={addingId === figure.id || figure.stock === 0}
                    className={`w-full font-black text-[10px] uppercase tracking-widest py-2 flex items-center justify-center gap-2 transition-all
                      ${figure.stock === 0 ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-orange-600/80 hover:bg-orange-500 text-black"}`}
                  >
                    {addingId === figure.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                    {figure.stock === 0 ? "Habis" : addingId === figure.id ? "Menambahkan..." : "Tambah"}
                  </button>
                </div>
              ))}
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