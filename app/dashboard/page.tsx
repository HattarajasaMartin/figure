"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Package, Star, TrendingUp,
  Users, Settings, ChevronRight, Loader2, Search,
  Bell, Heart, ClipboardList, LayoutDashboard, Boxes,
  ShoppingCart, Tag, BarChart3, CheckCircle, X
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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loadingFigures, setLoadingFigures] = useState(true);
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [wishlistingId, setWishlistingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Init user & role
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(profile?.role === "admin");
      setLoading(false);
    }
    init();
  }, []);

  // 2. Fetch products + realtime INSERT / UPDATE / DELETE DIUBAH
  useEffect(() => {
    async function fetchFigures() {
      setLoadingFigures(true);
      const { data, error } = await supabase
        .from("products").select("*").eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!error && data) setFigures(data);
      setLoadingFigures(false);
    }

    fetchFigures();

    const channel = supabase
      .channel("products-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, (payload) => {
        // Produk baru ditambahkan admin → langsung muncul kalau is_published true
        if (payload.new.is_published) {
          setFigures((prev) => [payload.new as Figure, ...prev]);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const updated = payload.new as Figure;
        if (!updated.is_published) {
          // Kalau di-unpublish → hilangkan dari list user
          setFigures((prev) => prev.filter((f) => f.id !== updated.id));
        } else {
          // Update data (stok, harga, nama, dll) langsung realtime
          setFigures((prev) => {
            const exists = prev.find((f) => f.id === updated.id);
            if (exists) {
              return prev.map((f) => f.id === updated.id ? updated : f);
            } else {
              // Produk sebelumnya unpublished, sekarang dipublish → tambahkan
              return [updated, ...prev];
            }
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "products" }, (payload) => {
        // Produk dihapus admin → langsung hilang
        setFigures((prev) => prev.filter((f) => f.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. Fetch cart, wishlist, order count — khusus user biasa
  useEffect(() => {
    if (!user) return;

    async function fetchUserCounts() {
      // Cart
      const { data: cart } = await supabase
        .from("cart_items").select("quantity").eq("user_id", user.id);
      if (cart) setCartCount(cart.reduce((sum: number, item: any) => sum + item.quantity, 0));

      // Wishlist
      const { data: wishlist } = await supabase
        .from("wishlists").select("product_id").eq("user_id", user.id);
      if (wishlist) {
        setWishlistCount(wishlist.length);
        setWishlistIds(new Set(wishlist.map((w: any) => w.product_id)));
      }

      // Orders
      const { data: orders } = await supabase
        .from("orders").select("id").eq("user_id", user.id);
      if (orders) setOrderCount(orders.length);
    }

    fetchUserCounts();
  }, [user]);

  // 4. Fetch pending orders + realtime — khusus admin
  useEffect(() => {
    if (!user || !isAdmin) return;

    async function fetchPending() {
      const { data } = await supabase
        .from("orders").select("id").eq("status", "pending");
      if (data) setPendingOrderCount(data.length);
    }

    fetchPending();

    const channel = supabase
      .channel("admin-pending-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => { setPendingOrderCount((prev) => prev + 1); }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async () => {
          const { data } = await supabase
            .from("orders").select("id").eq("status", "pending");
          if (data) setPendingOrderCount(data.length);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  async function toggleWishlist(figure: Figure) {
    if (!user) return;
    setWishlistingId(figure.id);
    const isWishlisted = wishlistIds.has(figure.id);
    try {
      if (isWishlisted) {
        await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", figure.id);
        setWishlistIds((prev) => { const next = new Set(prev); next.delete(figure.id); return next; });
        setWishlistCount((prev) => prev - 1);
        showToast(`${figure.name} dihapus dari wishlist`);
      } else {
        await supabase.from("wishlists").insert({ user_id: user.id, product_id: figure.id });
        setWishlistIds((prev) => new Set(prev).add(figure.id));
        setWishlistCount((prev) => prev + 1);
        showToast(`${figure.name} ditambahkan ke wishlist! ❤️`);
      }
    } catch {
      showToast("Gagal mengubah wishlist", "error");
    } finally {
      setWishlistingId(null);
    }
  }

  async function addToCart(figure: Figure) {
    if (!user) return;
    if (figure.stock === 0) { showToast("Stok habis!", "error"); return; }
    setAddingId(figure.id);
    try {
      const { data: existing } = await supabase
        .from("cart_items").select("*")
        .eq("user_id", user.id).eq("product_id", figure.id).single();
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
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (f: Figure) =>
    f.thumbnail || f.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&size=300&background=0f172a&color=f97316&bold=true&font-size=0.33`;
  const getLine = (f: Figure) => f.line || f.brand || "-";
  const filteredFigures = figures.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    getLine(f).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono animate-pulse">Loading Arsenal...</p>
      </div>
    </div>
  );

  const buyerStats = [
    { label: "Total Pesanan", value: `${orderCount}`, icon: ClipboardList, color: "text-orange-400", border: "border-orange-500/30", href: "/dashboard/orders" },
    { label: "Wishlist", value: `${wishlistCount}`, icon: Heart, color: "text-red-400", border: "border-red-500/30", href: "/dashboard/wishlist" },
    { label: "Total Belanja", value: "Rp 0", icon: TrendingUp, color: "text-green-400", border: "border-green-500/30", href: "#" },
    { label: "Poin Reward", value: "0 pts", icon: Star, color: "text-cyan-400", border: "border-cyan-500/30", href: "#" },
  ];

  const adminStats = [
    { label: "Total Produk", value: `${figures.length}`, icon: Boxes, color: "text-orange-400", border: "border-orange-500/30", href: "#" },
    { label: "Pesanan Pending", value: `${pendingOrderCount}`, icon: ClipboardList, color: "text-cyan-400", border: "border-cyan-500/30", href: "/dashboard/admin/orders" },
    { label: "Total Revenue", value: "Rp 0", icon: TrendingUp, color: "text-green-400", border: "border-green-500/30", href: "#" },
    { label: "Total User", value: "1", icon: Users, color: "text-purple-400", border: "border-purple-500/30", href: "#" },
  ];

  const adminMenu = [
    { label: "Kelola Produk", desc: "Tambah, edit & hapus figure", icon: Boxes, href: "/dashboard/admin/products", color: "text-orange-400" },
    { label: "Kelola Pesanan", desc: "Proses & update status pesanan", icon: ClipboardList, href: "/dashboard/admin/orders", color: "text-cyan-400" },
    { label: "Kelola User", desc: "Manajemen akun pembeli", icon: Users, href: "/dashboard/admin/users", color: "text-purple-400" },
    { label: "Laporan", desc: "Revenue & statistik toko", icon: BarChart3, href: "/dashboard/admin/reports", color: "text-green-400" },
    { label: "Kategori", desc: "Atur kategori & seri figure", icon: Tag, href: "/dashboard/admin/categories", color: "text-yellow-400" },
    { label: "Pengaturan", desc: "Konfigurasi toko", icon: Settings, href: "/dashboard/admin/settings", color: "text-zinc-400" },
  ];

  const stats = isAdmin ? adminStats : buyerStats;

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
              <div className="w-9 h-9 bg-orange-500/10 border border-orange-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.3)] rounded">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-sm font-black italic uppercase tracking-tighter text-white leading-none">
                  QUANTUM <span className="text-orange-500">ARSENAL</span>
                </h1>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">
                  {isAdmin ? "Admin Panel" : "Figure Store"}
                </p>
              </div>
            </Link>

            {!isAdmin && (
              <div className="flex-1 max-w-md hidden md:flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari figure..."
                  className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-full font-mono"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {!isAdmin ? (
                <>
                  <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
                  </button>

                  <Link href="/dashboard/orders"
                    className="relative p-2 text-zinc-400 hover:text-orange-400 transition-colors" title="Pesanan Saya">
                    <ClipboardList className="w-4 h-4" />
                    {orderCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-orange-500 text-black text-[8px] font-black rounded-full flex items-center justify-center">
                        {orderCount > 9 ? "9+" : orderCount}
                      </span>
                    )}
                  </Link>

                  <Link href="/dashboard/wishlist" className="relative p-2 text-zinc-400 hover:text-red-400 transition-colors">
                    <Heart className="w-4 h-4" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {wishlistCount > 9 ? "9+" : wishlistCount}
                      </span>
                    )}
                  </Link>

                  <Link href="/dashboard/cart" className="relative p-2 text-zinc-400 hover:text-white transition-colors">
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-orange-500 text-black text-[8px] font-black rounded-full flex items-center justify-center">
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </Link>
                </>
              ) : (
                <Link href="/dashboard/admin/orders"
                  className="relative p-2 text-zinc-400 hover:text-cyan-400 transition-colors" title="Kelola Pesanan">
                  <ClipboardList className="w-4 h-4" />
                  {pendingOrderCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-cyan-500 text-black text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {pendingOrderCount > 9 ? "9+" : pendingOrderCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded ml-1">
                <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[8px] text-orange-400 font-bold uppercase">{user?.email?.[0]}</span>
                </div>
                <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[130px]">{user?.email}</p>
                {isAdmin && (
                  <span className="text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>
                )}
              </div>

              <button onClick={handleLogout} disabled={loggingOut}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-all text-[10px] uppercase tracking-widest font-bold font-mono rounded ml-1">
                {loggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                <span className="hidden sm:inline">{loggingOut ? "Keluar..." : "Logout"}</span>
              </button>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-8">

          {/* Welcome */}
          <div className="relative bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 border border-zinc-800 rounded-xl p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/60" />
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.5em] font-mono mb-1 animate-pulse">
              {isAdmin ? "Admin Dashboard" : "System Online"}
            </p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {isAdmin ? "Panel Kontrol" : "Welcome,"}{" "}
              <span className="text-orange-500">
                {isAdmin ? "Administrator" : user?.email?.split("@")[0]}
              </span>
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-1">
              {isAdmin ? "Kelola produk, pesanan, dan pengguna toko figure kamu" : "Temukan action figure koleksimu sekarang"}
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href}
                className={`relative bg-black/40 backdrop-blur-sm border ${stat.border} rounded-xl p-5 transition-all
                  ${stat.href !== "#" ? "hover:opacity-80 cursor-pointer" : "cursor-default pointer-events-none"}`}>
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 rounded-tl-xl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 rounded-br-xl" />
                <stat.icon className={`w-5 h-5 ${stat.color} mb-3 opacity-80`} />
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mt-1">{stat.label}</p>
              </Link>
            ))}
          </div>

          {/* Shortcut pesanan — user only */}
          {!isAdmin && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <ClipboardList className="w-4 h-4 text-zinc-500" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-mono">Akses Cepat</p>
              </div>
              <Link href="/dashboard/orders"
                className="group flex items-center justify-between gap-4 bg-zinc-900/40 border border-orange-500/20 hover:border-orange-500/50 rounded-xl px-5 py-4 transition-all hover:bg-zinc-900/70">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Pesanan Saya</p>
                    <p className="text-zinc-500 text-[10px] font-mono">Track status pesananmu secara realtime</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {orderCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded border border-orange-500/30 text-orange-400 bg-orange-500/10">
                      {orderCount} pesanan
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </div>
          )}

          {/* ADMIN MENU */}
          {isAdmin && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <LayoutDashboard className="w-4 h-4 text-zinc-500" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-mono">Menu Admin</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminMenu.map((item) => (
                  <Link key={item.label} href={item.href}
                    className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-zinc-600 rounded-xl p-5 flex items-center gap-4 transition-all hover:bg-zinc-900/70">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-700 group-hover:border-orange-500/50 transition-colors rounded-tl-xl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-700 group-hover:border-cyan-500/50 transition-colors rounded-br-xl" />
                    <div className="relative w-10 h-10 bg-black/50 border border-zinc-800 rounded-lg flex items-center justify-center group-hover:border-zinc-600 transition-colors shrink-0">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      {item.label === "Kelola Pesanan" && pendingOrderCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-cyan-500 text-black text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                          {pendingOrderCount > 9 ? "9+" : pendingOrderCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold tracking-wide text-sm">{item.label}</p>
                      <p className="text-zinc-500 text-[10px] font-mono mt-0.5 truncate">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* PRODUK FIGURE — user only */}
          {!isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-zinc-500" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-mono">
                    Koleksi Figure {search && `— "${search}"`}
                  </p>
                </div>
                <Link href="/dashboard/products" className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono uppercase tracking-widest flex items-center gap-1">
                  Lihat Semua <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex md:hidden items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded mb-4">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari figure..."
                  className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-full font-mono"
                />
              </div>

              {loadingFigures ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                </div>
              ) : filteredFigures.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-zinc-600 font-mono text-sm">Tidak ada figure ditemukan</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFigures.map((figure) => {
                    const isWishlisted = wishlistIds.has(figure.id);
                    return (
                      <div key={figure.id}
                        className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-zinc-600 rounded-xl overflow-hidden transition-all hover:bg-zinc-900/70">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30 z-10" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30 z-10" />

                        <button
                          onClick={() => toggleWishlist(figure)}
                          disabled={wishlistingId === figure.id}
                          className="absolute top-2 right-2 z-20 w-7 h-7 bg-black/60 border border-zinc-700 hover:border-red-500/50 rounded-full flex items-center justify-center transition-all"
                        >
                          {wishlistingId === figure.id
                            ? <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                            : <Heart className={`w-3 h-3 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-zinc-400 hover:text-red-400"}`} />
                          }
                        </button>

                        <Link href={`/products/${figure.slug}`} className="block">
                          <div className="relative aspect-square overflow-hidden bg-zinc-950">
                            <img
                              src={getImage(figure)}
                              alt={figure.name}
                              className={`w-full h-full object-cover transition-transform duration-300 ${figure.stock === 0 ? "opacity-40 grayscale" : "group-hover:scale-105"}`}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(figure.name)}&size=300&background=0f172a&color=f97316&bold=true&font-size=0.33`;
                              }}
                            />
                            {figure.stock === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <span className="text-[10px] bg-red-500/90 text-white px-2 py-1 rounded font-bold uppercase">Habis</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-1.5">
                            <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">{getLine(figure)}</p>
                            <p className="text-white font-bold text-sm leading-tight line-clamp-2">{figure.name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-zinc-400 font-mono">{figure.rating ?? "-"}</span>
                            </div>
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
                            ${figure.stock === 0 ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-orange-600/80 hover:bg-orange-500 text-black cursor-pointer"}`}
                        >
                          {addingId === figure.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                          {figure.stock === 0 ? "Habis" : addingId === figure.id ? "Menambahkan..." : "Tambah"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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