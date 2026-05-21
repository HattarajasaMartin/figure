"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { ShieldPlus, Lock, Loader2, ArrowLeft, Dna } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("PROTOCOL MISMATCH: Passwords don't match");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    alert("Unit Profile Created! Please check your email for activation.");
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030303] font-sans overflow-hidden">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: "url('/image_6.png')" }}
      />

      {/* OVERLAY - Tipis */}
      <div className="absolute inset-0 z-[1] bg-black/20" />

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-[460px] p-4 animate-in fade-in zoom-in duration-700">

        {/* Back Link */}
        <Link href="/login" className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors mb-5 group w-fit">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-mono uppercase tracking-widest">Return to Base</span>
        </Link>

        {/* CARD */}
        <div className="relative bg-black/10 backdrop-blur-sm border border-zinc-700 rounded-lg p-10 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">

          {/* Neon Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />

          {/* Header */}
          <div className="mb-10 text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <ShieldPlus className="w-7 h-7 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
              New <span className="text-cyan-400">Unit</span> Registration
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-[0.3em] font-mono">
              Initialize your collector credentials
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">

            {/* Email */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-300 font-bold ml-1 flex items-center gap-2">
                <Dna className="w-3 h-3 text-cyan-400" /> Designation (Email)
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/40 border border-zinc-700 text-white rounded-none h-12 focus:border-cyan-500 transition-all font-mono"
                placeholder="new_collector@quantum.com"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-300 font-bold ml-1 flex items-center gap-2">
                <Lock className="w-3 h-3 text-cyan-400" /> Access Protocol
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/40 border border-zinc-700 text-white rounded-none h-12 focus:border-cyan-500 transition-all font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-300 font-bold ml-1 flex items-center gap-2">
                <Lock className="w-3 h-3 text-cyan-400" /> Re-Verify Protocol
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-black/40 border border-zinc-700 text-white rounded-none h-12 focus:border-cyan-500 transition-all font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 p-2 text-center animate-pulse">
                <p className="text-red-500 text-[10px] font-mono uppercase tracking-tighter">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-14 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-400/50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> INITIALIZING...</>
              ) : (
                <><ShieldPlus className="w-5 h-5" /> CREATE UNIT PROFILE</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-zinc-800">
            <p className="text-[11px] text-zinc-400 uppercase tracking-[0.2em]">
              Already a member?{" "}
              <Link href="/login" className="text-cyan-400 font-bold hover:text-cyan-300 ml-1 underline underline-offset-4 decoration-cyan-500/30">
                Authorized Login
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Flavor Text */}
        <p className="text-[9px] text-zinc-600 text-center mt-5 uppercase tracking-[0.4em] font-mono">
          Quantum Arsenal Security Protocol v4.0.2
        </p>
      </div>
    </div>
  );
}