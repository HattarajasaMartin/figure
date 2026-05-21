"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft, Search,
  ClipboardList, ChevronRight, Clock, CheckCircle,
  XCircle, Truck, Package, X, Check, Wifi, WifiOff
} from "lucide-react";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  products: { name: string; thumbnail: string; image: string; line: string; brand: string };
};

type Order = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  shipping_address: any;
  order_items: OrderItem[];
  profiles: { full_name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: any }> = {
  pending:    { label: "Menunggu",   color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", icon: Clock },
  paid:       { label: "Dibayar",    color: "text-cyan-400",   border: "border-cyan-500/30",   bg: "bg-cyan-500/10",   icon: CheckCircle },
  processing: { label: "Diproses",   color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   icon: Package },
  shipped:    { label: "Dikirim",    color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", icon: Truck },
  delivered:  { label: "Diterima",   color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  icon: CheckCircle },
  cancelled:  { label: "Dibatalkan", color: "text-red-400",    border: "border-red-500/30",    bg: "bg-red-500/10",    icon: XCircle },
};

const ALL_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const flash = (id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashIds((prev) => { const s = new Set(prev); s.delete(id); return s; }), 2500);
  };

  const markNew = (id: string) => {
    setNewOrderIds((prev) => new Set(prev).add(id));
    setTimeout(() => setNewOrderIds((prev) => { const s = new Set(prev); s.delete(id); return s; }), 5000);
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      setUser(user);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (loading) return;

    fetchOrders();

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o)
          );
          flash(payload.new.id as string);
          showToast(`Pesanan #${(payload.new.id as string).slice(0, 8).toUpperCase()} diupdate`);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          fetchOrders();
          markNew(payload.new.id as string);
          showToast(`🆕 Pesanan baru masuk!`);
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [loading]);

  async function fetchOrders() {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, thumbnail, image, line, brand))")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
    setLoadingOrders(false);
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      showToast(`Status diupdate ke "${STATUS_CONFIG[newStatus]?.label}"!`);
    } else {
      showToast("Gagal update status", "error");
    }
    setUpdatingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const filtered = orders.filter((o) => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl transition-all
          ${toast.type === "success" ? "bg-zinc-900 border-green-500/50 text-green-400" : "bg-zinc-900 border-red-500/50 text-red-400"}`}>
          {toast.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          <p className="text-xs font-mono">{toast.msg}</p>
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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Admin — Kelola Pesanan</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {/* LIVE indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-mono font-bold
                ${isRealtime ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-zinc-800 text-zinc-600 bg-zinc-900/60"}`}>
                {isRealtime
                  ? <><Wifi className="w-3 h-3" /> LIVE</>
                  : <><WifiOff className="w-3 h-3" /> Offline</>
                }
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
                <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[130px]">{user?.email}</p>
                <span className="text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>
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
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.5em] font-mono mb-1">Admin Panel</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Kelola <span className="text-orange-500">Pesanan</span>
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-1">
              {orders.length} total pesanan · {orders.filter(o => o.status === "pending").length} menunggu konfirmasi
            </p>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 focus-within:border-zinc-600 px-3 py-2 rounded-lg transition-colors">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID atau nama user..."
                className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-48 font-mono"
              />
              {search && <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest font-mono transition-all border
                  ${filterStatus === "all" ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                Semua ({orders.length})
              </button>
              {ALL_STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = orders.filter(o => o.status === s).length;
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest font-mono transition-all border
                      ${filterStatus === s ? `${cfg.border} ${cfg.color} bg-black/30` : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 font-mono text-sm">Tidak ada pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["pending"];
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === order.id;
                const isFlashing = flashIds.has(order.id);
                const isNew = newOrderIds.has(order.id);

                return (
                  <div key={order.id}
                    className={`relative bg-zinc-900/40 border rounded-xl overflow-hidden transition-all duration-500
                      ${isNew ? "border-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.3)]" :
                        isFlashing ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]" : cfg.border}`}>

                    {/* New order bar */}
                    {isNew && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-yellow-300 to-orange-500 animate-pulse z-10" />
                    )}
                    {/* Updated bar */}
                    {isFlashing && !isNew && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-300 to-cyan-500 animate-pulse z-10" />
                    )}

                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/20" />

                    {/* Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-9 h-9 rounded-lg border ${cfg.border} ${cfg.bg} flex items-center justify-center shrink-0`}>
                          <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-white font-bold text-sm font-mono">
                            #{order.id.slice(0, 8).toUpperCase()}
                            {isNew && <span className="ml-2 text-[9px] text-orange-400 animate-pulse">● BARU</span>}
                            {isFlashing && !isNew && <span className="ml-2 text-[9px] text-cyan-400 animate-pulse">● UPDATED</span>}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono">
                            {order.user_id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        <p className="text-orange-400 font-black text-sm hidden sm:block">
                          Rp {Number(order.total).toLocaleString("id-ID")}
                        </p>
                        <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </button>

                    {/* Detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-5 py-4 space-y-4">

                        {/* Items */}
                        <div className="space-y-2">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                                <img
                                  src={item.products?.thumbnail || item.products?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.products?.name || "?")}&size=60&background=0f172a&color=f97316&bold=true`}
                                  alt={item.products?.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=P&size=60&background=0f172a&color=f97316&bold=true`; }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold truncate">{item.products?.name}</p>
                                <p className="text-[9px] text-cyan-400 font-mono uppercase">{item.products?.line || item.products?.brand || "-"}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-zinc-400 text-xs font-mono">{item.quantity}x</p>
                                <p className="text-white text-sm font-bold">Rp {Number(item.price).toLocaleString("id-ID")}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Shipping */}
                        {order.shipping_address && (
                          <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Alamat Pengiriman</p>
                            <p className="text-zinc-300 text-xs font-mono">
                              {typeof order.shipping_address === "string"
                                ? order.shipping_address
                                : `${order.shipping_address.address || ""}, ${order.shipping_address.city || ""}`}
                            </p>
                          </div>
                        )}

                        {/* Update Status */}
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4">
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-3">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {ALL_STATUSES.map((s) => {
                              const c = STATUS_CONFIG[s];
                              const isCurrent = order.status === s;
                              return (
                                <button key={s}
                                  onClick={() => !isCurrent && updateStatus(order.id, s)}
                                  disabled={isCurrent || updatingId === order.id}
                                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest font-mono transition-all border
                                    ${isCurrent
                                      ? `${c.border} ${c.color} ${c.bg} cursor-default`
                                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                                    } disabled:opacity-50`}
                                >
                                  {updatingId === order.id && !isCurrent
                                    ? <Loader2 className="w-3 h-3 animate-spin inline" />
                                    : c.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                          <p className="text-[9px] text-zinc-600 font-mono">ID: {order.id}</p>
                          <p className="text-orange-400 font-black">Rp {Number(order.total).toLocaleString("id-ID")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}