"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle, Clock, XCircle, Shield } from "lucide-react";

function FinishContent() {
  const params = useSearchParams();
  const router = useRouter();

  const transactionStatus = params.get("transaction_status");
  const orderId = params.get("order_id");

  const isSuccess = transactionStatus === "settlement" || transactionStatus === "capture";
  const isPending = transactionStatus === "pending";

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/image_6.png')" }} />
      <div className="absolute inset-0 z-[1] bg-black/50" />

      <div className="relative z-10 w-full max-w-md space-y-6 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/50 flex items-center justify-center rounded">
            <Shield className="w-6 h-6 text-orange-400" />
          </div>
          <h1 className="text-lg font-black italic uppercase tracking-tighter text-white">
            QUANTUM <span className="text-orange-500">ARSENAL</span>
          </h1>
        </div>

        {/* Card */}
        <div className={`relative bg-zinc-900/60 border rounded-xl p-8 space-y-4
          ${isSuccess ? "border-green-500/30" : isPending ? "border-yellow-500/30" : "border-red-500/30"}`}>
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60" />

          {isSuccess && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                Pembayaran <span className="text-green-400">Berhasil!</span>
              </h2>
              <p className="text-zinc-400 text-sm font-mono">
                Pesananmu sedang diproses oleh admin. Kamu akan mendapat update status pengiriman segera.
              </p>
            </>
          )}

          {isPending && (
            <>
              <Clock className="w-16 h-16 text-yellow-400 mx-auto" />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                Menunggu <span className="text-yellow-400">Pembayaran</span>
              </h2>
              <p className="text-zinc-400 text-sm font-mono">
                Selesaikan pembayaranmu sebelum waktu habis.
              </p>
            </>
          )}

          {!isSuccess && !isPending && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                Pembayaran <span className="text-red-400">Gagal</span>
              </h2>
              <p className="text-zinc-400 text-sm font-mono">
                Transaksi dibatalkan atau ditolak. Silakan coba lagi.
              </p>
            </>
          )}

          {orderId && (
            <p className="text-[10px] text-zinc-600 font-mono border-t border-zinc-800 pt-3">
              Order ID: {orderId}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all">
            Kembali ke Toko
          </button>
          {isSuccess && (
            <button
              onClick={() => router.push("/dashboard/orders")}
              className="flex-1 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-lg transition-all">
              Lihat Pesanan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentFinishPage() {
  return (
    <Suspense>
      <FinishContent />
    </Suspense>
  );
}