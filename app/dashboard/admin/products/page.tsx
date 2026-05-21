"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Loader2, ArrowLeft, Plus, Pencil,
  Trash2, Search, X, Check, AlertTriangle,
  Package, ToggleLeft, ToggleRight, Upload
} from "lucide-react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  slug: string;
  line: string;
  brand: string;
  price: number;
  image: string;
  thumbnail: string;
  rating: number;
  stock: number;
  is_published: boolean;
  created_at: string;
};

type FormData = {
  name: string;
  line: string;
  brand: string;
  price: string;
  image: string;
  thumbnail: string;
  rating: string;
  stock: string;
  is_published: boolean;
};

const EMPTY_FORM: FormData = {
  name: "", line: "", brand: "", price: "",
  image: "", thumbnail: "", rating: "5", stock: "", is_published: true,
};

const generateSlug = (name: string) =>
  name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const inputClass = "w-full bg-zinc-900/60 border border-zinc-800 focus:border-orange-500/60 text-white text-sm font-mono px-3 py-2.5 rounded-lg outline-none transition-colors placeholder:text-zinc-700";
const labelClass = "block text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1";

export default function AdminProductsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      setUser(user);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!loading) fetchProducts();
  }, [loading]);

  async function fetchProducts() {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setProducts(data);
    setLoadingProducts(false);
  }

  async function handleUploadImage(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "image" | "thumbnail"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Hanya file gambar yang diperbolehkan!", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran file maksimal 5MB!", "error");
      return;
    }

    const setter = field === "image" ? setUploadingImage : setUploadingThumb;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("products")
        .upload(fileName, file, { upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("products").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, [field]: data.publicUrl }));
      showToast("Gambar berhasil diupload! ✅");
    } catch (err: any) {
      showToast(err.message || "Gagal upload gambar", "error");
    } finally {
      setter(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelectedProduct(null);
    setModal("create");
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name, line: p.line || "", brand: p.brand || "",
      price: String(p.price), image: p.image || "", thumbnail: p.thumbnail || "",
      rating: String(p.rating ?? 5), stock: String(p.stock), is_published: p.is_published,
    });
    setSelectedProduct(p);
    setModal("edit");
  }

  function openDelete(p: Product) {
    setSelectedProduct(p);
    setModal("delete");
  }

  function closeModal() {
    setModal(null);
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.stock) {
      showToast("Nama, harga, dan stok wajib diisi!", "error");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: generateSlug(form.name),
      line: form.line.trim(),
      brand: form.brand.trim(),
      price: Number(form.price),
      image: form.image.trim(),
      thumbnail: form.thumbnail.trim(),
      rating: Number(form.rating) || 5,
      stock: Number(form.stock),
      is_published: form.is_published,
    };
    try {
      if (modal === "create") {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        showToast("Produk berhasil ditambahkan! 🎉");
      } else if (modal === "edit" && selectedProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", selectedProduct.id);
        if (error) throw error;
        showToast("Produk berhasil diupdate! ✅");
      }
      await fetchProducts();
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan produk", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedProduct) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", selectedProduct.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      showToast("Produk berhasil dihapus!");
      closeModal();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus produk", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublish(p: Product) {
    const { error } = await supabase
      .from("products").update({ is_published: !p.is_published }).eq("id", p.id);
    if (!error) {
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_published: !x.is_published } : x));
      showToast(`Produk ${!p.is_published ? "dipublikasikan" : "disembunyikan"}!`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const getImage = (p: Product) =>
    p.thumbnail || p.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=80&background=0f172a&color=f97316&bold=true`;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.line || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono animate-pulse">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#030303] font-sans overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl
          ${toast.type === "success" ? "bg-zinc-900 border-green-500/50 text-green-400" : "bg-zinc-900 border-red-500/50 text-red-400"}`}>
          {toast.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
          <p className="text-xs font-mono">{toast.msg}</p>
        </div>
      )}

      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('/image_6.png')" }} />
      <div className="absolute inset-0 z-[1] bg-black/50" />

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60" />

            {/* DELETE */}
            {modal === "delete" && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-black uppercase tracking-wide">Hapus Produk</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Tindakan ini tidak bisa dibatalkan</p>
                  </div>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-300 text-sm font-mono">
                    Yakin hapus <span className="text-white font-bold">"{selectedProduct?.name}"</span>?
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={closeModal}
                    className="flex-1 py-2.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg text-xs font-mono uppercase tracking-widest transition-all">
                    Batal
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {deleting ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            )}

            {/* CREATE / EDIT */}
            {(modal === "create" || modal === "edit") && (
              <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-black uppercase tracking-wide text-sm">
                        {modal === "create" ? "Tambah Produk" : "Edit Produk"}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono">
                        {modal === "edit" ? selectedProduct?.name : "Isi data produk baru"}
                      </p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="text-zinc-600 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Nama */}
                <div>
                  <label className={labelClass}>Nama Produk *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Figma Naruto S.H.Figuarts"
                    className={inputClass}
                  />
                  {form.name && (
                    <p className="text-[9px] text-zinc-600 font-mono mt-1">
                      slug: <span className="text-cyan-600">{generateSlug(form.name)}</span>
                    </p>
                  )}
                </div>

                {/* Line & Brand */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Line / Seri</label>
                    <input
                      type="text"
                      value={form.line}
                      onChange={(e) => setForm((prev) => ({ ...prev, line: e.target.value }))}
                      placeholder="S.H.Figuarts"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Brand</label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                      placeholder="Bandai"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Harga & Stok */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Harga (Rp) *</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="350000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Stok *</label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                      placeholder="10"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Rating */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Rating (1-5)</label>
                    <input
                      type="number"
                      value={form.rating}
                      onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
                      placeholder="5"
                      min="1"
                      max="5"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* URL Gambar */}
                <div>
                  <label className={labelClass}>URL Gambar</label>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="https://... atau upload file di bawah"
                    className={inputClass}
                  />
                  <label className={`mt-2 inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-[10px] font-mono uppercase tracking-widest cursor-pointer transition-all
                    ${uploadingImage ? "border-zinc-700 text-zinc-600 cursor-not-allowed" : "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"}`}>
                    {uploadingImage
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Upload className="w-3.5 h-3.5" />}
                    {uploadingImage ? "Mengupload..." : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => handleUploadImage(e, "image")}
                    />
                  </label>
                </div>

                {/* URL Thumbnail */}
                <div>
                  <label className={labelClass}>URL Thumbnail</label>
                  <input
                    type="text"
                    value={form.thumbnail}
                    onChange={(e) => setForm((prev) => ({ ...prev, thumbnail: e.target.value }))}
                    placeholder="https://... atau upload file di bawah"
                    className={inputClass}
                  />
                  <label className={`mt-2 inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-[10px] font-mono uppercase tracking-widest cursor-pointer transition-all
                    ${uploadingThumb ? "border-zinc-700 text-zinc-600 cursor-not-allowed" : "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"}`}>
                    {uploadingThumb
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Upload className="w-3.5 h-3.5" />}
                    {uploadingThumb ? "Mengupload..." : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingThumb}
                      onChange={(e) => handleUploadImage(e, "thumbnail")}
                    />
                  </label>
                </div>

                {/* Preview */}
                {(form.thumbnail || form.image) && (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.thumbnail || form.image}
                      alt="preview"
                      className="w-14 h-14 object-cover rounded-lg border border-zinc-800"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <p className="text-[10px] text-zinc-600 font-mono">Preview gambar</p>
                  </div>
                )}

                {/* Publish toggle */}
                <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-bold">Publikasikan</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Tampilkan produk ke pembeli</p>
                  </div>
                  <button onClick={() => setForm((prev) => ({ ...prev, is_published: !prev.is_published }))}>
                    {form.is_published
                      ? <ToggleRight className="w-8 h-8 text-orange-400" />
                      : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
                  </button>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={closeModal}
                    className="flex-1 py-2.5 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg text-xs font-mono uppercase tracking-widest transition-all">
                    Batal
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 bg-orange-600/80 hover:bg-orange-500 text-black rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {saving ? "Menyimpan..." : modal === "create" ? "Tambahkan" : "Simpan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Admin — Kelola Produk</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
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
          <div className="relative bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 border border-zinc-800 rounded-xl p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/60" />
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-cyan-400 uppercase tracking-[0.5em] font-mono mb-1">Admin Panel</p>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                  Kelola <span className="text-orange-500">Produk</span>
                </h2>
                <p className="text-zinc-500 text-xs font-mono mt-1">
                  {products.length} produk total · {products.filter(p => p.is_published).length} dipublikasikan
                </p>
              </div>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-orange-500/20">
                <Plus className="w-4 h-4" /> Tambah Produk
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 focus-within:border-zinc-600 px-4 py-2.5 rounded-lg transition-colors max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, line, atau brand..."
              className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none w-full font-mono"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          {loadingProducts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 font-mono text-sm">
                {search ? `Tidak ada produk untuk "${search}"` : "Belum ada produk"}
              </p>
              {!search && (
                <button onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded transition-all">
                  <Plus className="w-3.5 h-3.5" /> Tambah Produk Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="relative bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-orange-500/30" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-cyan-500/30" />

              <div className="grid grid-cols-[56px_1fr_120px_80px_80px_80px_100px] gap-3 px-4 py-3 border-b border-zinc-800 bg-black/30">
                {["", "Produk", "Harga", "Stok", "Rating", "Status", "Aksi"].map((h) => (
                  <p key={h} className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">{h}</p>
                ))}
              </div>

              <div className="divide-y divide-zinc-800/60">
                {filtered.map((p) => (
                  <div key={p.id}
                    className="grid grid-cols-[56px_1fr_120px_80px_80px_80px_100px] gap-3 px-4 py-3 items-center hover:bg-zinc-900/40 transition-colors">

                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                      <img src={getImage(p)} alt={p.name} className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=80&background=0f172a&color=f97316&bold=true`; }} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{p.name}</p>
                      <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest truncate">
                        {p.line || p.brand || "-"}
                      </p>
                    </div>

                    <p className="text-orange-400 font-black text-sm font-mono">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </p>

                    <p className={`text-sm font-bold font-mono ${p.stock === 0 ? "text-red-400" : p.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>
                      {p.stock}
                    </p>

                    <p className="text-zinc-400 font-mono text-sm">⭐ {p.rating ?? "-"}</p>

                    <button onClick={() => togglePublish(p)}>
                      {p.is_published
                        ? <ToggleRight className="w-7 h-7 text-orange-400 hover:text-orange-300 transition-colors" />
                        : <ToggleLeft className="w-7 h-7 text-zinc-600 hover:text-zinc-400 transition-colors" />}
                    </button>

                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)}
                        className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openDelete(p)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-900 pt-5">
            <p className="text-[9px] text-zinc-700 text-center uppercase tracking-[0.4em] font-mono">
              Quantum Arsenal — Admin Panel v1.0.0
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}