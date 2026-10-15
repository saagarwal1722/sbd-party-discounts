 "use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { Search, Plus, Pencil, Trash2, Download, Upload, LogOut, Store, MapPin, Users, X, RefreshCw } from "lucide-react";

type Party = {
  id: string;
  name: string;
  city: string;
  discount: number;
  phone: string | null;
  notes: string | null;
  created_at?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("any");
  const [customMin, setCustomMin] = useState("0");
  const [customMax, setCustomMax] = useState("100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [form, setForm] = useState({ name: "", city: "", discount: "0", phone: "", notes: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session && supabase) void loadParties(); }, [session]);

  async function loadParties() {
    if (!supabase) return;
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("parties").select("*").order("name", { ascending: true });
    if (e) setError(e.message); else setParties((data || []) as Party[]);
    setLoading(false);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setAuthBusy(true); setError(""); setMessage("");
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (e1) setError(e1.message);
    setAuthBusy(false);
  }

  async function signUp() {
    if (!supabase) return;
    if (!email.trim() || password.length < 8) { setError("Enter your email and a password with at least 8 characters."); return; }
    setAuthBusy(true); setError(""); setMessage("");
    const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
    if (e) setError(e.message);
    else setMessage("Account created. If email confirmation is enabled, confirm your email before signing in.");
    setAuthBusy(false);
  }

  function openAdd() {
    setEditing(null); setForm({ name: "", city: "", discount: "0", phone: "", notes: "" }); setModalOpen(true);
  }
  function openEdit(p: Party) {
    setEditing(p); setForm({ name: p.name, city: p.city, discount: String(p.discount), phone: p.phone || "", notes: p.notes || "" }); setModalOpen(true);
  }

  async function saveParty(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const name = form.name.trim(), city = form.city.trim(), discount = Number(form.discount);
    if (!name || !city) { setError("Party name and city are required."); return; }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) { setError("Discount must be between 0 and 100."); return; }
    setError(""); setMessage("");
    const payload = { name, city, discount, phone: form.phone.trim() || null, notes: form.notes.trim() || null };
    const result = editing
      ? await supabase.from("parties").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("parties").insert(payload).select().single();
    if (result.error) { setError(result.error.message); return; }
    setModalOpen(false); setMessage(editing ? "Party updated." : "Party added.");
    await loadParties();
  }

  async function deleteParty(p: Party) {
    if (!supabase || !window.confirm(`Delete ${p.name} from the party directory? This cannot be undone.`)) return;
    const { error: e } = await supabase.from("parties").delete().eq("id", p.id);
    if (e) setError(e.message); else { setMessage("Party deleted."); await loadParties(); }
  }

  const cities = useMemo(() => Array.from(new Set(parties.map(p => p.city.trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)), [parties]);
  const filtered = useMemo(() => parties.filter(p => {
    const q = query.trim().toLowerCase();
    const matchesName = !q || p.name.toLowerCase().includes(q) || (p.phone || "").toLowerCase().includes(q);
    const matchesCity = cityFilter === "all" || p.city === cityFilter;
    let matchesDiscount = true;
    if (discountFilter === "exact") matchesDiscount = p.discount === Number(customMin);
    if (discountFilter === "minimum") matchesDiscount = p.discount >= Number(customMin);
    if (discountFilter === "range") matchesDiscount = p.discount >= Number(customMin) && p.discount <= Number(customMax);
    return matchesName && matchesCity && matchesDiscount;
  }).sort((a,b)=>a.name.localeCompare(b.name)), [parties, query, cityFilter, discountFilter, customMin, customMax]);

  function exportExcel() {
    const rows = filtered.map(({name,city,discount,phone,notes}) => ({ "Party Name": name, City: city, "Discount (%)": discount, Phone: phone || "", Notes: notes || "" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parties");
    XLSX.writeFile(wb, "shree-balaji-party-discounts.xlsx");
  }

  async function importExcel(e: React.ChangeEvent<HTMLInputElement>) {
    if (!supabase || !e.target.files?.[0]) return;
    setError(""); setMessage("");
    try {
      const buffer = await e.target.files[0].arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const records = rows.map(row => {
        const normalized: Record<string, unknown> = {};
        Object.entries(row).forEach(([k,v]) => normalized[k.trim().toLowerCase()] = v);
        const name = String(normalized["party name"] ?? normalized["name"] ?? "").trim();
        const city = String(normalized["city"] ?? "").trim();
        const discountRaw = normalized["discount (%)"] ?? normalized["discount"] ?? normalized["discount %"];
        const discount = Number(discountRaw);
        return { name, city, discount, phone: String(normalized["phone"] ?? "").trim() || null, notes: String(normalized["notes"] ?? "").trim() || null };
      }).filter(r => r.name && r.city && Number.isFinite(r.discount) && r.discount >= 0 && r.discount <= 100);
      if (!records.length) throw new Error("No valid rows found. Use columns Party Name, City, Discount (%), Phone, Notes.");
      const { error: e1 } = await supabase.from("parties").insert(records);
      if (e1) throw e1;
      setMessage(`Imported ${records.length} parties. Existing records were not automatically overwritten.`);
      await loadParties();
    } catch (err: any) { setError(err.message || "Could not import this file."); }
    finally { e.target.value = ""; }
  }

  if (!ready) return <main className="center-page"><div className="loader" />Loading your workspace…</main>;

  if (!supabase) return <main className="center-page"><section className="setup-card"><div className="brand-mark"><Store size={25}/></div><h1>Connect your database</h1><p>Add your Supabase project URL and publishable/anon key in Vercel’s Environment Variables. Follow the README included with this project.</p><code>NEXT_PUBLIC_SUPABASE_URL</code><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></section></main>;

  if (!session) return <main className="auth-page"><section className="auth-card">
    <div className="brand-mark"><Store size={27}/></div><p className="eyebrow">SHREE BALAJI DECOR</p><h1>Party Discount Manager</h1><p className="muted">Your party directory, organised by city and discount.</p>
    <form onSubmit={signIn} className="stack">
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" required autoComplete="current-password"/></label>
      <button className="primary full" disabled={authBusy}>{authBusy ? "Please wait…" : "Sign in"}</button>
    </form>
    <button className="text-button full" onClick={signUp} disabled={authBusy}>Create a new account</button>
    {error && <p className="alert error">{error}</p>}{message && <p className="alert success">{message}</p>}
    <p className="tiny muted">Private workspace · Cloud database · Works on mobile and desktop</p>
  </section></main>;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark small"><Store size={21}/></div><div><strong>Shree Balaji Decor</strong><span>Party Discount Manager</span></div></div>
      <button className="quiet" onClick={async()=>{await supabase?.auth.signOut();}}><LogOut size={16}/> Sign out</button>
    </header>
    <section className="welcome"><div><p className="eyebrow">PARTY DIRECTORY</p><h1>Know every party’s discount.</h1><p className="muted">Search by name, filter by city, and find the right discount in seconds.</p></div><button className="primary" onClick={openAdd}><Plus size={18}/> Add party</button></section>
    <section className="stats">
      <div className="stat-card"><span className="stat-icon"><Users size={18}/></span><span className="muted">Total parties</span><strong>{parties.length}</strong></div>
      <div className="stat-card"><span className="stat-icon"><MapPin size={18}/></span><span className="muted">Cities covered</span><strong>{cities.length}</strong></div>
      <div className="stat-card"><span className="stat-icon"><Store size={18}/></span><span className="muted">Highest discount</span><strong>{parties.length ? Math.max(...parties.map(p=>p.discount)) : 0}%</strong></div>
    </section>
    {error && <div className="alert error dismiss"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
    {message && <div className="alert success dismiss"><span>{message}</span><button onClick={()=>setMessage("")}><X size={16}/></button></div>}
    <section className="directory-card">
      <div className="directory-heading"><div><h2>All parties</h2><p className="muted">{filtered.length} matching {filtered.length === 1 ? "party" : "parties"}</p></div><div className="tools"><button className="secondary" onClick={exportExcel}><Download size={16}/> Export Excel</button><button className="secondary" onClick={()=>fileRef.current?.click()}><Upload size={16}/> Import Excel</button><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importExcel}/></div></div>
      <div className="filters">
        <div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search party name or phone…"/>{query && <button onClick={()=>setQuery("")} aria-label="Clear search"><X size={15}/></button>}</div>
        <label className="filter-field"><span>City</span><select value={cityFilter} onChange={e=>setCityFilter(e.target.value)}><option value="all">All cities</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="filter-field"><span>Discount</span><select value={discountFilter} onChange={e=>setDiscountFilter(e.target.value)}><option value="any">Any discount</option><option value="exact">Exactly</option><option value="minimum">Minimum</option><option value="range">Range</option></select></label>
        {discountFilter !== "any" && <label className="filter-field number-field"><span>{discountFilter==="exact"?"Exact %":discountFilter==="minimum"?"At least %":"From %"}</span><input type="number" min="0" max="100" value={customMin} onChange={e=>setCustomMin(e.target.value)}/></label>}
        {discountFilter === "range" && <label className="filter-field number-field"><span>To %</span><input type="number" min="0" max="100" value={customMax} onChange={e=>setCustomMax(e.target.value)}/></label>}
        <button className="icon-button" title="Refresh list" onClick={loadParties}><RefreshCw size={17}/></button>
      </div>
      {loading ? <div className="empty"><div className="loader"/><p>Loading parties…</p></div> : filtered.length === 0 ? <div className="empty"><div className="empty-icon"><Search size={24}/></div><h3>{parties.length ? "No matching parties" : "Your directory is ready"}</h3><p className="muted">{parties.length ? "Try changing your search or filters." : "Add your first party or import your existing Excel sheet."}</p>{!parties.length && <button className="primary" onClick={openAdd}><Plus size={17}/> Add your first party</button>}</div> :
      <div className="table-wrap"><table><thead><tr><th>Party name</th><th>City</th><th>Discount</th><th>Phone</th><th>Notes</th><th className="actions-heading">Actions</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td><span className="city-tag"><MapPin size={13}/>{p.city}</span></td><td><span className="discount-pill">{p.discount}%</span></td><td>{p.phone || <span className="muted">—</span>}</td><td className="notes-cell">{p.notes || <span className="muted">—</span>}</td><td><div className="row-actions"><button className="icon-button" title="Edit party" onClick={()=>openEdit(p)}><Pencil size={16}/></button><button className="icon-button danger-icon" title="Delete party" onClick={()=>deleteParty(p)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
      <div className="directory-footer"><span>Discounts are stored as percentages (0–100).</span><span>{filtered.length} of {parties.length} parties</span></div>
    </section>
    <footer>SHREE BALAJI DECOR <span>·</span> Private business workspace</footer>
    {modalOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false);}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><p className="eyebrow">{editing ? "UPDATE RECORD" : "NEW RECORD"}</p><h2 id="modal-title">{editing ? "Edit party" : "Add a party"}</h2></div><button className="icon-button" onClick={()=>setModalOpen(false)} aria-label="Close"><X size={18}/></button></div><form className="stack" onSubmit={saveParty}><label>Party name *<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Sharma Plywood" required/></label><label>City *<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Jaipur" required list="city-suggestions"/><datalist id="city-suggestions">{cities.map(c=><option key={c} value={c}/>)}</datalist></label><label>General discount (%) *<input type="number" min="0" max="100" step="0.01" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})} required/></label><label>Phone number <span className="muted optional">(optional)</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Contact number"/></label><label>Notes <span className="muted optional">(optional)</span><textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any useful details…"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModalOpen(false)}>Cancel</button><button className="primary" type="submit">{editing ? "Save changes" : "Save party"}</button></div></form></section></div>}
  </main>;
}
