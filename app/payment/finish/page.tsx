"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PaymentFinishPage() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const orderId = params.get("order_id");         // QA-xxx
  const statusCode = params.get("status_code");   // 200
  const transactionStatus = params.get("transaction_status"); // settlement / pending

  useEffect(() => {
    if (!orderId) return;

    async function updateOrder() {
      const status =
        transactionStatus === "settlement" || transactionStatus === "capture"
          ? "paid"
          : transactionStatus === "pending"
          ? "pending"
          : "failed";

      await supabase
        .from("orders")
        .update({ status })
        .eq("midtrans_order_id", orderId);
    }

    updateOrder();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white gap-4">
      {transactionStatus === "settlement" || transactionStatus === "capture" ? (
        <>
          <h1 className="text-2xl font-black text-green-400">Pembayaran Berhasil! 🎉</h1>
          <p className="text-zinc-400 text-sm font-mono">Order ID: {orderId}</p>
          <button onClick={() => router.push("/dashboard")}
            className="mt-4 px-6 py-2 bg-orange-600 text-black font-bold rounded-lg">
            Kembali ke Toko
          </button>
        </>
      ) : transactionStatus === "pending" ? (
        <>
          <h1 className="text-2xl font-black text-yellow-400">Menunggu Pembayaran</h1>
          <p className="text-zinc-400 text-sm">Selesaikan pembayaranmu sebelum waktu habis.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-black text-red-400">Pembayaran Gagal</h1>
          <button onClick={() => router.push("/dashboard/cart")}
            className="mt-4 px-6 py-2 bg-zinc-800 text-white font-bold rounded-lg">
            Coba Lagi
          </button>
        </>
      )}
    </div>
  );
}