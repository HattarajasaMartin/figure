"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, KeyRound, Dna } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("AUTHENTICATION FAILED: INVALID CREDENTIALS");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030303] font-sans overflow-hidden">
      
      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] scale-105 animate-pulse"
        style={{ backgroundImage: "url('/image_6.png')" }}
      />
      
      {/* GRADIENT OVERLAY - Tipis */}
      <div className="absolute inset-0 z-[1] bg-black/20" />

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-[420px] p-4 animate-in fade-in zoom-in duration-700">
        
        {/* Frame Hologram */}
        <div className="relative bg-black/10 backdrop-blur-sm border border-zinc-700 rounded-lg p-10 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          
          {/* Aksen Siku Neon */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />

          {/* Header Branding */}
          <div className="mb-12 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-400 font-bold mb-3 animate-pulse">
              System Authorization
            </p>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-white">
              QUANTUM<br />
              <span className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]">ARSENAL</span>
            </h1>
            <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-[0.3em]">
              Operator Terminal Access v2.0
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-7">
            {/* Field Operator ID */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-300 font-bold ml-1">
                Operator ID
              </label>
              <div className="relative">
                <Dna className="absolute left-3.5 top-3.5 w-4 h-4 text-cyan-500/60 group-focus-within:text-cyan-400 transition-colors" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/40 border border-zinc-700 text-white pl-11 rounded-none h-12 focus:border-cyan-500 transition-all font-mono"
                  placeholder="ID_PROTOCOL"
                  required
                />
              </div>
            </div>

            {/* Field Access Code */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-300 font-bold ml-1">
                Access Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-cyan-500/60 group-focus-within:text-cyan-400 transition-colors" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/40 border border-zinc-700 text-white pl-11 rounded-none h-12 focus:border-cyan-500 transition-all font-mono"
                  placeholder="••••••••••"
                  required
                />
              </div>
            </div>

            {/* Remember & Lost protocol */}
            <div className="flex items-center justify-between px-1 text-[11px]">
              <div className="flex items-center space-x-2.5">
                <Checkbox 
                   id="rem" 
                   checked={remember} 
                   onCheckedChange={(checked) => setRemember(!!checked)}
                   className="border-zinc-700 data-[state=checked]:bg-orange-600 rounded-none w-3.5 h-3.5"
                />
                <label htmlFor="rem" className="text-zinc-400 uppercase cursor-pointer hover:text-zinc-300">
                  Remember Unit
                </label>
              </div>
              <Link href="#" className="text-cyan-500 hover:text-cyan-400 uppercase italic font-bold tracking-widest transition-colors">
                Lost Protocol?
              </Link>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 p-2 text-center animate-pulse">
                <p className="text-red-500 text-[10px] font-mono uppercase tracking-tighter">{error}</p>
              </div>
            )}

            {/* Deploy Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_25px_rgba(249,115,22,0.5)] border border-orange-400/50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> SYNCHRONIZING...</>
              ) : (
                <><Shield className="w-5 h-5" /> DEPLOY TO ARSENAL</>
              )}
            </button>
          </form>

          {/* Footer Register link */}
          <div className="text-center mt-10 pt-6 border-t border-zinc-800">
            <p className="text-[11px] text-zinc-400 uppercase tracking-[0.2em]">
              New Collector?{" "}
              <Link href="/register" className="text-orange-400 font-bold hover:text-orange-300 ml-1 underline underline-offset-4 decoration-orange-500/30">
                Register Unit
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}