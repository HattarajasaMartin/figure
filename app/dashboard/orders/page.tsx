"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft, Package,
  ChevronRight, Clock, CheckCircle,
  XCircle, Truck, ShoppingBag, Wifi, WifiOff, MapPin
} from "lucide-react";
import Link from "next/link";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: { name: string; thumbnail: string; image: string; line: string; brand: string };
};

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  shipping_address: any;
  order_items: OrderItem[];
};

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: any; desc: string }> = {
  pending:    { label: "Menunggu",   color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/10", icon: Clock,       desc: "Pesanan menunggu pembayaran." },
  paid:       { label: "Dibayar",    color: "text-cyan-400",   border: "border-cyan-500/30",   bg: "bg-cyan-500/10",   icon: CheckCircle, desc: "Pembayaran dikonfirmasi!" },
  processing: { label: "Diproses",   color: "text-blue-400",   border: "border-blue-500/30",   bg: "bg-blue-500/10",   icon: Package,     desc: "Pesanan sedang disiapkan." },
  shipped:    { label: "Dikirim",    color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", icon: Truck,       desc: "Paket dalam perjalanan!" },
  delivered:  { label: "Diterima",   color: "text-green-400",  border: "border-green-500/30",  bg: "bg-green-500/10",  icon: CheckCircle, desc: "Pesanan sudah sampai. Terima kasih!" },
  cancelled:  { label: "Dibatalkan", color: "text-red-400",    border: "border-red-500/30",    bg: "bg-red-500/10",    icon: XCircle,     desc: "Pesanan ini dibatalkan." },
};

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const flash = (id: string) => {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashIds((prev) => { const s = new Set(prev); s.delete(id); return s; }), 2500);
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
    if (!user) return;

    async function fetchOrders() {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, thumbnail, image, line, brand))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) setOrders(data as Order[]);
      setLoadingOrders(false);
    }

    fetchOrders();

    const channel = supabase
      .channel("user-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o)
          );
          flash(payload.new.id as string);
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (p: OrderItem["products"]) =>
    p?.thumbnail || p?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.name || "?")}&size=60&background=0f172a&color=f97316&bold=true`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Riwayat Pesanan</p>
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
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-mono">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Toko
          </Link>

          <div className="relative bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 border border-zinc-800 rounded-xl p-6">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/60" />
            <p className="text-[10px] text-cyan-400 uppercase tracking-[0.5em] font-mono mb-1">Akun Saya</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Riwayat <span className="text-orange-500">Pesanan</span>
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-1">{orders.length} pesanan ditemukan · update otomatis realtime</p>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 font-mono text-sm">Belum ada pesanan</p>
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded transition-all">
                <Package className="w-3.5 h-3.5" /> Mulai Belanja
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["pending"];
                const StatusIcon = cfg.icon;
                const isExpanded = expandedId === order.id;
                const isFlashing = flashIds.has(order.id);
                const stepIdx = STATUS_STEPS.indexOf(order.status);
                const isCancelled = order.status === "cancelled";

                return (
                  <div key={order.id}
                    className={`relative bg-zinc-900/40 border rounded-xl overflow-hidden transition-all duration-500
                      ${isFlashing ? "border-orange-400 shadow-[0_0_24px_rgba(251,146,60,0.25)]" : cfg.border}`}>

                    {/* Flash bar top */}
                    {isFlashing && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-yellow-300 to-orange-500 animate-pulse z-10" />
                    )}

                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-orange-500/30" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-cyan-500/30" />

                    {/* Order Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-9 h-9 rounded-lg border ${cfg.border} ${cfg.bg} flex items-center justify-center shrink-0`}>
                          <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-white font-bold text-sm font-mono truncate">
                            #{order.id.slice(0, 8).toUpperCase()}
                            {isFlashing && (
                              <span className="ml-2 text-[9px] text-orange-400 animate-pulse">● UPDATED</span>
                            )}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono">{formatDate(order.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        <p className="text-orange-400 font-black text-sm hidden sm:block">
                          Rp {Number(order.total).toLocaleString("id-ID")}
                        </p>
                        <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </button>

                    {/* Order Detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-5 py-4 space-y-4">

                        {/* Progress Tracker */}
                        {!isCancelled ? (
                          <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-4">Progress Pesanan</p>
                            <div className="flex items-start">
                              {STATUS_STEPS.map((step, idx) => {
                                const sCfg = STATUS_CONFIG[step];
                                const SIcon = sCfg.icon;
                                const isDone = stepIdx >= idx;
                                const isCurrent = stepIdx === idx;
                                return (
                                  <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                                        ${isCurrent
                                          ? `${sCfg.border} ${sCfg.bg} ${sCfg.color} shadow-lg ring-2 ring-offset-1 ring-offset-zinc-950 ring-current`
                                          : isDone
                                          ? "border-green-500/60 bg-green-500/10 text-green-400"
                                          : "border-zinc-700 bg-zinc-900 text-zinc-600"}`}>
                                        <SIcon className="w-3.5 h-3.5" />
                                      </div>
                                      <p className={`text-[8px] font-mono text-center leading-tight w-14
                                        ${isCurrent ? sCfg.color : isDone ? "text-green-400" : "text-zinc-600"}`}>
                                        {sCfg.label}
                                      </p>
                                    </div>
                                    {idx < STATUS_STEPS.length - 1 && (
                                      <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all duration-700
                                        ${stepIdx > idx ? "bg-green-500/50" : "bg-zinc-800"}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <p className={`text-xs font-mono mt-2 ${cfg.color}`}>{cfg.desc}</p>
                          </div>
                        ) : (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-red-400 text-xs font-mono">{cfg.desc}</p>
                          </div>
                        )}

                        <p className="text-orange-400 font-black text-base sm:hidden">
                          Total: Rp {Number(order.total).toLocaleString("id-ID")}
                        </p>

                        {/* Items */}
                        <div className="space-y-2">
                          {order.order_items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                                <img src={getImage(item.products)} alt={item.products?.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.products?.name || "?")}&size=60&background=0f172a&color=f97316&bold=true`; }}
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

                        {/* Shipping address */}
                        {order.shipping_address && (
                          <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-0.5">Alamat Pengiriman</p>
                              <p className="text-zinc-300 text-xs font-mono">
                                {typeof order.shipping_address === "string"
                                  ? order.shipping_address
                                  : `${order.shipping_address.address || ""}, ${order.shipping_address.city || ""}`}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                          <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
                            ID: {order.id.slice(0, 16)}...
                          </p>
                          <p className="text-orange-400 font-black">
                            Rp {Number(order.total).toLocaleString("id-ID")}
                          </p>
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