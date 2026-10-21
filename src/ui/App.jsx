import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudUpload,
  Copy,
  Download,
  FileImage,
  FileText,
  Filter,
  Headphones,
  House,
  Laptop,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react";

const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
      )
    : null;
const icons = {
  Electronics: Laptop,
  Appliances: Zap,
  Furniture: House,
  Vehicles: Activity,
  Other: PackageIcon,
};
function PackageIcon(props) {
  return <Shield {...props} />;
}
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const starterItems = [
  {
    id: "demo-1",
    name: "Studio Display",
    brand: "Apple",
    store: "Apple Store",
    price: 1599,
    purchase_date: daysFromNow(-326),
    warranty_end: daysFromNow(39),
    category: "Electronics",
    notes: "27-inch 5K Retina display",
    support_email: "support@apple.com",
    receipt_url: null,
  },
  {
    id: "demo-2",
    name: "Brew Pro Espresso Machine",
    brand: "Breville",
    store: "Williams Sonoma",
    price: 699,
    purchase_date: daysFromNow(-347),
    warranty_end: daysFromNow(18),
    category: "Appliances",
    notes: "Serial no. BES878",
    support_email: "",
    receipt_url: null,
  },
  {
    id: "demo-3",
    name: "Cloud Sofa",
    brand: "Article",
    store: "Article",
    price: 1899,
    purchase_date: daysFromNow(-211),
    warranty_end: daysFromNow(154),
    category: "Furniture",
    notes: "Charme tan leather",
    support_email: "",
    receipt_url: null,
  },
  {
    id: "demo-4",
    name: "Air purifier 3000i",
    brand: "Philips",
    store: "Best Buy",
    price: 329,
    purchase_date: daysFromNow(-385),
    warranty_end: daysFromNow(-20),
    category: "Electronics",
    notes: "Filter replaced in April",
    support_email: "",
    receipt_url: null,
  },
];
const dateFormat = (
  d,
  opts = { month: "short", day: "numeric", year: "numeric" },
) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", opts) : "—");
const dayDiff = (d) =>
  Math.ceil((new Date(`${d}T23:59:59`) - new Date()) / 86400000);
const money = (n, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(Number(n) || 0);
const datePlus = (date, value, unit) => {
  const d = new Date(`${date}T12:00:00`);
  if (unit === "days") d.setDate(d.getDate() + Number(value));
  else {
    const months = Number(value) * (unit === "years" ? 12 : 1),
      day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(
      Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
    );
  }
  return d.toISOString().slice(0, 10);
};
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wv-items")) || starterItems;
    } catch {
      return starterItems;
    }
  });
  const [active, setActive] = useState("Overview");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("wv-theme") === "dark",
  );
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [claimItem, setClaimItem] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      return {
        ...{ alerts: true, emailAlerts: false, email: "", currency: "INR" },
        ...JSON.parse(localStorage.getItem("wv-settings") || "{}"),
      };
    } catch {
      return { alerts: true, emailAlerts: false, email: "", currency: "INR" };
    }
  });
  const [filters, setFilters] = useState({
    query: "",
    category: "All categories",
    status: "All warranties",
  });
  const [editing, setEditing] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem("wv-welcome-dismissed") === "yes",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("wv-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    localStorage.setItem("wv-items", JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem("wv-settings", JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user || null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setAuthOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("items")
      .select("*, receipts(file_url)")
      .order("warranty_end")
      .then(({ data, error }) => {
        if (!error && data)
          setItems(
            data.map((i) => ({
              ...i,
              receipt_url: i.receipts?.[0]?.file_url || null,
            })),
          );
      });
  }, [user]);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setSettings((s) => ({
            ...s,
            alerts: data.browser_alerts,
            emailAlerts: data.email_alerts,
            email: data.notification_email || user.email || "",
            currency: data.currency || "INR",
          }));
        else setSettings((s) => ({ ...s, email: s.email || user.email || "" }));
      });
  }, [user]);
  useEffect(() => {
    if (
      !settings.alerts ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const check = () => {
      let sent = {};
      try {
        sent = JSON.parse(localStorage.getItem("wv-reminders") || "{}");
      } catch {}
      const next = { ...sent };
      items.forEach((i) =>
        [30, 7, 1].forEach((n, index) => {
          const d = dayDiff(i.warranty_end),
            floor = [7, 1, -1][index],
            key = `${i.id}:${n}`;
          if (d <= n && d > floor && !sent[key]) {
            try {
              new Notification(
                `Warranty expires in ${n} day${n === 1 ? "" : "s"}`,
                { body: `${i.name} · ${dateFormat(i.warranty_end)}` },
              );
              next[key] = true;
            } catch {}
          }
        }),
      );
      localStorage.setItem("wv-reminders", JSON.stringify(next));
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [items, settings.alerts]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const sortedItems = useMemo(
    () =>
      items
        .filter((i) => {
          const q = filters.query.trim().toLowerCase(),
            text =
              !q ||
              [i.name, i.brand, i.store, i.category].some((v) =>
                String(v || "")
                  .toLowerCase()
                  .includes(q),
              ),
            category =
              filters.category === "All categories" ||
              i.category === filters.category,
            d = dayDiff(i.warranty_end),
            status =
              filters.status === "All warranties" ||
              (filters.status === "Expiring soon" && d >= 0 && d <= 30) ||
              (filters.status === "Active" && d > 30) ||
              (filters.status === "Expired" && d < 0);
          return text && category && status;
        })
        .sort((a, b) => new Date(a.warranty_end) - new Date(b.warranty_end)),
    [items, filters],
  );
  const expiring = items.filter(
    (i) => dayDiff(i.warranty_end) >= 0 && dayDiff(i.warranty_end) <= 30,
  ).length;
  const total = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const activeCount = items.filter((i) => dayDiff(i.warranty_end) >= 0).length;
  const onSave = async (entry, file, existingId = null) => {
    let receipt_url = entry.receipt_url || null;
    const row = { ...entry, id: existingId || uid(), user_id: user?.id };
    if (supabase && user) {
      const payload = {
        user_id: user.id,
        name: entry.name,
        brand: entry.brand,
        store: entry.store,
        price: Number(entry.price) || 0,
        purchase_date: entry.purchase_date,
        warranty_end: entry.warranty_end,
        warranty_duration_months: entry.warranty_duration_months || null,
        category: entry.category,
        notes: entry.notes,
        support_email: entry.support_email,
        support_url: entry.support_url,
      };
      const { data, error } = existingId
        ? await supabase
            .from("items")
            .update(payload)
            .eq("id", existingId)
            .select()
            .single()
        : await supabase.from("items").insert(payload).select().single();
      if (error) {
        setToast(`Could not save: ${error.message}`);
        return false;
      }
      row.id = data.id;
      if (file) {
        const path = `${user.id}/${data.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage
          .from("receipts")
          .upload(path, file, { upsert: true });
        if (!up.error) {
          const { data: old } = await supabase
            .from("receipts")
            .select("file_url")
            .eq("item_id", data.id);
          if (old?.length) {
            await supabase.storage
              .from("receipts")
              .remove(old.map((r) => r.file_url));
            await supabase.from("receipts").delete().eq("item_id", data.id);
          }
          await supabase.from("receipts").insert({
            user_id: user.id,
            item_id: data.id,
            file_url: path,
            file_name: file.name,
          });
          receipt_url = path;
        } else {
          setToast(
            `Item saved, but receipt upload failed: ${up.error.message}`,
          );
        }
      }
      if (existingId)
        await supabase.from("reminders").delete().eq("item_id", data.id);
      const today = daysFromNow(0),
        due = [30, 7, 1]
          .map((n) => ({
            user_id: user.id,
            item_id: data.id,
            reminder_date: datePlus(entry.warranty_end, -n, "days"),
            days_before: n,
            status: "pending",
          }))
          .filter((r) => r.reminder_date >= today);
      if (due.length) {
        const { error: re } = await supabase.from("reminders").insert(due);
        if (re)
          setToast(`Item saved, but reminder setup failed: ${re.message}`);
      }
    } else if (file) receipt_url = await saveDemoReceipt(file);
    row.receipt_url = receipt_url;
    setItems((prev) =>
      existingId
        ? prev.map((i) => (i.id === existingId ? row : i))
        : [...prev, row],
    );
    if (existingId) setSelected(row);
    setAddOpen(false);
    setEditing(null);
    setToast(existingId ? "Item updated" : "Item added to your vault");
    return true;
  };
  const removeItem = async (id) => {
    if (supabase && user) {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) {
        setToast(`Could not remove item: ${error.message}`);
        return;
      }
    }
    setItems(items.filter((i) => i.id !== id));
    setSelected(null);
    setToast("Item removed");
  };
  const signIn = async (provider, email) => {
    if (!supabase) {
      setToast("Add your Supabase keys to enable sign-in");
      return;
    }
    setAuthBusy(true);
    try {
      if (provider === "google") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        if (!email) {
          setAuthOpen(true);
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setAuthOpen(false);
        setToast("Check your email for a secure sign-in link");
      }
    } catch (e) {
      setToast(e.message);
    } finally {
      setAuthBusy(false);
    }
  };
  const openAdd = (item = null) => {
    setEditing(item);
    setAddOpen(true);
  };
  const saveSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (supabase && user)
      supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            browser_alerts: next.alerts,
            email_alerts: next.emailAlerts,
            notification_email: next.email,
            currency: next.currency,
          },
          { onConflict: "user_id" },
        )
        .then(
          ({ error }) =>
            error && setToast(`Settings not saved: ${error.message}`),
        );
  };
  const exportCsv = () =>
    download(
      new Blob([itemsToCsv(items, settings.currency)], {
        type: "text/csv;charset=utf-8",
      }),
      "warranty-vault.csv",
    );
  const exportPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("WarrantyVault inventory", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Exported ${dateFormat(daysFromNow(0))} · ${items.length} items`,
      14,
      25,
    );
    autoTable(doc, {
      startY: 31,
      head: [
        [
          "Item",
          "Brand",
          "Store",
          "Price",
          "Purchased",
          "Warranty ends",
          "Status",
        ],
      ],
      body: sortedItems.map((i) => {
        const d = dayDiff(i.warranty_end);
        return [
          i.name,
          i.brand || "—",
          i.store || "—",
          money(i.price, settings.currency),
          dateFormat(i.purchase_date),
          dateFormat(i.warranty_end),
          d < 0 ? "Expired" : d <= 30 ? "Expiring soon" : "Active",
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [48, 104, 72] },
    });
    doc.save("warranty-vault.pdf");
  };
  const exportBundle = async () => {
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file("warranty-data.csv", itemsToCsv(items, settings.currency));
      const folder = zip.folder("receipts");
      let added = 0;
      for (const item of items) {
        if (!item.receipt_url) continue;
        try {
          folder.file(
            `${safeName(item.name)}-${safeName(item.brand || "receipt")}.${extensionFor(item.receipt_url)}`,
            await getReceiptBlob(item.receipt_url),
          );
          added++;
        } catch {}
      }
      download(
        await zip.generateAsync({ type: "blob" }),
        "warranty-vault-backup.zip",
      );
      setToast(
        `Backup downloaded${added ? ` with ${added} receipt${added === 1 ? "" : "s"}` : ""}`,
      );
    } catch (e) {
      setToast(`Export failed: ${e.message}`);
    }
  };
  const navTo = (x) => {
    setActive(x);
    setMobileNav(false);
    setSelected(null);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navTo("Overview");
          }}
        >
          <span className="brand-mark">
            <ShieldCheck size={20} />
          </span>
          <span>
            Warranty<span className="brand-light">Vault</span>
          </span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list">
          <button
            className={`nav-item ${active === "Overview" ? "active" : ""}`}
            onClick={() => navTo("Overview")}
          >
            <House size={18} />
            Overview
          </button>
          <button
            className={`nav-item ${active === "My items" ? "active" : ""}`}
            onClick={() => navTo("My items")}
          >
            <Shield size={18} />
            My items<span className="nav-count">{items.length}</span>
          </button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon">
            <CircleHelp size={17} />
          </div>
          <div>
            <b>Need a hand?</b>
            <small>We’re here to help.</small>
          </div>
          <ChevronRight size={16} />
        </div>
        <button
          className={`nav-item settings-link ${active === "Settings" ? "active" : ""}`}
          onClick={() => navTo("Settings")}
        >
          <SettingsIcon size={18} />
          Settings
        </button>
        <div className="profile-row">
          <div className="avatar">{user?.email?.[0]?.toUpperCase() || "K"}</div>
          <div className="profile-copy">
            <b>{user?.email?.split("@")[0] || "Your vault"}</b>
            <small>{user ? "Personal account" : "Demo workspace"}</small>
          </div>
          {user ? (
            <button
              className="icon-button tiny"
              title="Sign out"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              className="icon-button tiny"
              title="Sign in"
              onClick={() => signIn("email")}
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <span className="brand-mark">
              <ShieldCheck size={19} />
            </span>
            <b>
              Warranty<span className="brand-light">Vault</span>
            </b>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{selected ? "Item details" : active}</b>
          </div>
          <div className="top-actions">
            <button
              className="icon-button theme-toggle"
              title="Toggle dark mode"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="notification-button"
              onClick={async () => {
                if (!("Notification" in window)) {
                  setToast("Notifications are not supported in this browser");
                  return;
                }
                const p = await Notification.requestPermission();
                setToast(
                  p === "granted"
                    ? "Expiry alerts enabled on this device"
                    : "Notifications are blocked in browser settings",
                );
              }}
            >
              <Bell size={17} />
              <span>Alerts</span>
              {expiring > 0 && <i />}
            </button>
            <button
              className="primary-button top-add"
              onClick={() => openAdd()}
            >
              <Plus size={17} />
              Add item
            </button>
          </div>
        </header>
        <div className="content-wrap">
          {active === "Settings" ? (
            <SettingsPage
              settings={settings}
              setSettings={saveSettings}
              dark={dark}
              setDark={setDark}
              user={user}
              signIn={signIn}
              toast={setToast}
              exportCsv={exportCsv}
              exportPdf={exportPdf}
              exportBundle={exportBundle}
            />
          ) : selected ? (
            <DetailPage
              item={selected}
              currency={settings.currency}
              onBack={() => setSelected(null)}
              onEdit={() => openAdd(selected)}
              onClaim={() => setClaimItem(selected)}
              onDelete={() => removeItem(selected.id)}
              toast={setToast}
            />
          ) : (
            <>
              {!supabase && !welcomeDismissed && (
                <div className="welcome-callout">
                  <span className="welcome-icon">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <b>Welcome to your warranty vault</b>
                    <span>
                      These sample items show how your dashboard works. Add a
                      real purchase whenever you’re ready.
                    </span>
                  </div>
                  <button className="text-button" onClick={() => openAdd()}>
                    Add your first item <ArrowRight size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Dismiss welcome message"
                    onClick={() => {
                      localStorage.setItem("wv-welcome-dismissed", "yes");
                      setWelcomeDismissed(true);
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-dot" />
                    YOUR PERSONAL INVENTORY
                  </div>
                  <h1>
                    {active === "My items"
                      ? "All your items, in one place."
                      : "Your warranties, under control."}
                    <span className="wave">✦</span>
                  </h1>
                  <p>
                    Keep every purchase protected. We’ll help you stay one step
                    ahead.
                  </p>
                </div>
                <button
                  className="primary-button heading-add"
                  onClick={() => openAdd()}
                >
                  <Plus size={17} />
                  Add item
                </button>
              </div>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <Sparkles size={14} /> YOUR COVERAGE, AT A GLANCE
                  </span>
                  <h2>
                    Everything you own.
                    <br />
                    <em>Nothing you forget.</em>
                  </h2>
                  <p>
                    Your warranties are in good hands. We’ll remind you before
                    it’s time to act.
                  </p>
                  <button
                    className="hero-link"
                    onClick={() => navTo("My items")}
                  >
                    View your collection <ArrowRight size={15} />
                  </button>
                </div>
                <div className="hero-visual">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />
                  <div className="hero-ring ring-one" />
                  <div className="hero-ring ring-two" />
                  <div className="hero-shield">
                    <ShieldCheck size={37} />
                  </div>
                  <div className="floating-card float-top">
                    <span className="float-check">
                      <Check size={11} />
                    </span>
                    <span>All in one place</span>
                  </div>
                  <div className="floating-card float-bottom">
                    <span className="float-spark">
                      <Bell size={12} />
                    </span>
                    <span>We’ll remind you</span>
                  </div>
                  <div className="sparkle spark-a">✦</div>
                  <div className="sparkle spark-b">✧</div>
                </div>
                <div className="hero-index">
                  01 <span /> 04
                </div>
              </section>
              <section className="stats-grid">
                <StatCard
                  icon={ShieldCheck}
                  label="Protected items"
                  value={items.length}
                  foot="Across your collection"
                  tone="mint"
                />
                <StatCard
                  icon={Clock3}
                  label="Expiring soon"
                  value={expiring}
                  foot="Next 30 days"
                  tone="amber"
                />
                <StatCard
                  icon={ArrowDownToLine}
                  label="Purchase value"
                  value={money(total, settings.currency)}
                  foot="Tracked in your vault"
                  tone="violet"
                />
                <StatCard
                  icon={CalendarDays}
                  label="Active coverage"
                  value={`${activeCount} / ${items.length}`}
                  foot="Warranties in effect"
                  tone="blue"
                />
              </section>
              <section className="items-section">
                <div className="section-header">
                  <div>
                    <div className="eyebrow mini-eyebrow">YOUR COLLECTION</div>
                    <h2>
                      {active === "My items" ? "All items" : "Your items"}{" "}
                      <span className="section-count">{items.length}</span>
                    </h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navTo("My items")}
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>
                <div className="toolbar">
                  <label className="search-wrap">
                    <Search size={17} />
                    <input
                      aria-label="Search your items"
                      value={filters.query}
                      onChange={(e) =>
                        setFilters((v) => ({ ...v, query: e.target.value }))
                      }
                      placeholder="Search your items…"
                    />
                    <kbd>/</kbd>
                  </label>
                  <div className="toolbar-actions">
                    <label className="select-wrap">
                      <Filter size={15} />
                      <select
                        aria-label="Filter by category"
                        value={filters.category}
                        onChange={(e) =>
                          setFilters((v) => ({
                            ...v,
                            category: e.target.value,
                          }))
                        }
                      >
                        {[
                          "All categories",
                          "Electronics",
                          "Appliances",
                          "Furniture",
                          "Vehicles",
                          "Other",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </label>
                    <label className="select-wrap">
                      <ShieldCheck size={15} />
                      <select
                        aria-label="Filter by status"
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((v) => ({ ...v, status: e.target.value }))
                        }
                      >
                        {[
                          "All warranties",
                          "Expiring soon",
                          "Active",
                          "Expired",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  </div>
                </div>
                <div className="list-subtitle">
                  <Clock3 size={13} />
                  Sorted by expiry date · soonest first
                </div>
                <div className="item-list">
                  {sortedItems.length ? (
                    sortedItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        currency={settings.currency}
                        open={() => setSelected(item)}
                        onClaim={() => setClaimItem(item)}
                      />
                    ))
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon">
                        <Shield size={23} />
                      </span>
                      <b>
                        {items.length
                          ? "No matching items"
                          : "Your vault is ready"}
                      </b>
                      <span>
                        {items.length
                          ? "Try changing your search or filters."
                          : "Add a purchase to start tracking its warranty."}
                      </span>
                      {!items.length && (
                        <button
                          className="primary-button"
                          onClick={() => openAdd()}
                        >
                          <Plus size={16} />
                          Add your first item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
              <footer className="footnote">
                <ShieldCheck size={14} /> Your purchase details are private and
                secure <span>·</span>{" "}
                <button onClick={() => navTo("Settings")}>
                  Manage your vault
                </button>
              </footer>
            </>
          )}
        </div>
      </main>
      {addOpen && (
        <AddModal
          item={editing}
          currency={settings.currency}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          onSave={(entry, file) => onSave(entry, file, editing?.id || null)}
          toast={setToast}
        />
      )}
      {authOpen && (
        <AuthModal
          busy={authBusy}
          onClose={() => setAuthOpen(false)}
          onEmail={(email) => signIn("email", email)}
          onGoogle={() => signIn("google")}
        />
      )}
      {claimItem && (
        <ClaimModal
          item={claimItem}
          onClose={() => setClaimItem(null)}
          toast={setToast}
        />
      )}
      {toast && (
        <div className="toast">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, foot, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}
function ItemRow({ item, currency, open, onClaim }) {
  const d = dayDiff(item.warranty_end);
  const status = d < 0 ? "expired" : d <= 30 ? "soon" : "active";
  const label =
    d < 0
      ? `${Math.abs(d)} days ago`
      : d === 0
        ? "Expires today"
        : `${d} days left`;
  const Icon = icons[item.category] || Shield;
  return (
    <article className="item-row">
      <button
        className={`item-art art-${item.category?.toLowerCase() || "other"}`}
        onClick={open}
        aria-label={`Open ${item.name}`}
      >
        <Icon size={22} />
      </button>
      <button className="item-info" onClick={open}>
        <strong>{item.name}</strong>
        <span>
          {item.brand || "No brand"} <i>·</i> {item.store || "Purchase details"}
        </span>
      </button>
      <div className="item-price">
        <span>Purchase price</span>
        <b>{money(item.price, currency)}</b>
      </div>
      <div className="item-date">
        <span>Warranty ends</span>
        <b>{dateFormat(item.warranty_end)}</b>
      </div>
      <div className={`status-pill ${status}`}>
        <i />
        {status === "active"
          ? "Active"
          : status === "soon"
            ? "Expiring"
            : "Expired"}{" "}
        <span>· {label}</span>
      </div>
      <button className="row-more" onClick={onClaim} title="Prepare a claim">
        <MoreHorizontal size={19} />
      </button>
      <button
        className="row-chevron"
        onClick={open}
        aria-label={`View ${item.name}`}
      >
        <ChevronRight size={18} />
      </button>
    </article>
  );
}
function AddModal({ item, currency, onClose, onSave, toast }) {
  const [form, setForm] = useState(() =>
    item
      ? { ...item, price: item.price || "" }
      : {
          name: "",
          brand: "",
          store: "",
          price: "",
          purchase_date: daysFromNow(0),
          warranty_end: datePlus(daysFromNow(0), 12, "months"),
          category: "Electronics",
          notes: "",
          support_email: "",
          support_url: "",
        },
  );
  const [durationMode, setDurationMode] = useState(
    !item || !!item.warranty_duration_months,
  );
  const [duration, setDuration] = useState(
    item?.warranty_duration_months || 12,
  );
  const [durationUnit, setDurationUnit] = useState("months");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocr, setOcr] = useState(false);
  const input = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview("");
    if (!f.type.startsWith("image/")) return;
    setOcr(true);
    toast("Reading receipt…");
    try {
      const T = await import("tesseract.js");
      const { data } = await T.recognize(f, "eng");
      const text = data.text || "";
      const lines = text
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const candidates = lines.filter(
        (x) =>
          x.length > 4 &&
          !/receipt|invoice|total|tax|change|cash|visa|mastercard/i.test(x),
      );
      const priceMatch =
        text.match(/(?:total|amount)[^\d]{0,12}\$?\s?(\d{1,5}\.\d{2})/i) ||
        text.match(/\$\s?(\d{1,5}\.\d{2})/);
      const dateMatch = text.match(
        /\b(\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4}))\b/,
      );
      setForm((fm) => ({
        ...fm,
        name: fm.name || candidates[1] || candidates[0] || "",
        store: fm.store || candidates[0] || "",
        price: fm.price || priceMatch?.[1] || "",
        purchase_date:
          fm.purchase_date === daysFromNow(0)
            ? dateMatch
              ? normalizeDate(dateMatch[1])
              : fm.purchase_date
            : fm.purchase_date,
      }));
      toast("Receipt scanned — review the details");
    } catch (e) {
      toast("Could not read the receipt. You can enter details manually.");
    } finally {
      setOcr(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    const warranty_end = durationMode
      ? datePlus(
          form.purchase_date,
          Number(duration) * (durationUnit === "years" ? 12 : 1),
          "months",
        )
      : form.warranty_end;
    if (
      !form.name ||
      !form.purchase_date ||
      !warranty_end ||
      warranty_end < form.purchase_date
    ) {
      toast("Add a valid item name, purchase date, and warranty expiry");
      return;
    }
    setBusy(true);
    const ok = await onSave(
      {
        ...form,
        warranty_end,
        warranty_duration_months: durationMode
          ? Number(duration) * (durationUnit === "years" ? 12 : 1)
          : null,
      },
      file,
    );
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal add-modal">
        <header className="modal-header">
          <div>
            <span className="eyebrow mini-eyebrow">
              {item ? "EDIT YOUR VAULT" : "ADD TO YOUR VAULT"}
            </span>
            <h2>{item ? "Update this purchase" : "Protect a new purchase"}</h2>
            <p>Save the details now. You can edit them any time.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div
            className="upload-zone"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <img src={preview} className="receipt-preview" />
            ) : (
              <div className="upload-icon">
                <CloudUpload size={22} />
              </div>
            )}
            <div className="upload-copy">
              <b>{file ? file.name : "Upload a receipt"}</b>
              <span>
                {ocr
                  ? "Reading receipt with OCR…"
                  : "Drop a file here, or browse · JPG, PNG, PDF"}
              </span>
            </div>
            <button
              type="button"
              className="browse-button"
              onClick={(e) => {
                e.stopPropagation();
                input.current?.click();
              }}
            >
              {ocr ? (
                "Scanning…"
              ) : (
                <>
                  <Upload size={14} />
                  Browse
                </>
              )}
            </button>
            <input
              ref={input}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <div className="form-grid">
            <label className="field full">
              Product name <em>*</em>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Studio Display"
                required
              />
            </label>
            <label className="field">
              Brand
              <input
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Apple"
              />
            </label>
            <label className="field">
              Store
              <input
                value={form.store}
                onChange={(e) => set("store", e.target.value)}
                placeholder="Where did you buy it?"
              />
            </label>
            <label className="field">
              Purchase date
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => set("purchase_date", e.target.value)}
              />
            </label>
            <label className="field">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="$0.00"
              />
            </label>
            <label className="field">
              Category
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                {Object.keys(icons).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field full">
              Warranty coverage <em>*</em>
              <div className="coverage-mode">
                <input
                  aria-label="Warranty length"
                  type="number"
                  min="1"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <select
                  aria-label="Duration unit"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDurationMode(true)}
                >
                  Duration
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDurationMode(false)}
                >
                  Exact date
                </button>
              </div>
              {durationMode ? (
                <small className="expiry-preview">
                  Expires{" "}
                  {form.purchase_date
                    ? dateFormat(
                        datePlus(
                          form.purchase_date,
                          Number(duration) *
                            (durationUnit === "years" ? 12 : 1),
                          "months",
                        ),
                      )
                    : "—"}
                </small>
              ) : (
                <input
                  type="date"
                  value={form.warranty_end || ""}
                  onChange={(e) => set("warranty_end", e.target.value)}
                  required
                />
              )}
            </label>
            <label className="field full">
              Support email <span className="optional">for claim helper</span>
              <input
                type="email"
                value={form.support_email}
                onChange={(e) => set("support_email", e.target.value)}
                placeholder="support@brand.com"
              />
            </label>
            <label className="field full">
              Support website <span className="optional">for claim helper</span>
              <input
                type="url"
                value={form.support_url || ""}
                onChange={(e) => set("support_url", e.target.value)}
                placeholder="https://support.brand.com"
              />
            </label>
            <label className="field full">
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Serial number, color, or anything useful…"
                rows="2"
              />
            </label>
          </div>
          <div className="modal-footer">
            <span className="secure-note">
              <ShieldCheck size={14} /> Your data stays yours
            </span>
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy || ocr}>
                {busy ? (
                  "Saving…"
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Save item
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
function DetailPage({
  item,
  currency,
  onBack,
  onClaim,
  onDelete,
  onEdit,
  toast,
}) {
  const d = dayDiff(item.warranty_end);
  const status = d < 0 ? "expired" : d <= 30 ? "soon" : "active";
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to your items
      </button>
      <div className="detail-heading">
        <div>
          <div className="eyebrow mini-eyebrow">ITEM DETAILS</div>
          <h1>{item.name}</h1>
          <p>
            {item.brand || "Brand not added"} <i>·</i> Purchased at{" "}
            {item.store || "store not added"}
          </p>
        </div>
        <div className="detail-actions">
          <button className="secondary-button" onClick={onEdit}>
            <Pencil size={15} /> Edit item
          </button>
          <button className="primary-button" onClick={onClaim}>
            <Headphones size={16} /> Prepare a claim
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-card">
            <div className="detail-card-head">
              <h3>Warranty status</h3>
              <span className={`status-pill ${status}`}>
                <i />
                {status === "active"
                  ? "Active"
                  : status === "soon"
                    ? "Expiring soon"
                    : "Expired"}
              </span>
            </div>
            <div className="coverage-line">
              <div className="coverage-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <strong>
                  {d < 0
                    ? `Expired ${Math.abs(d)} days ago`
                    : d === 0
                      ? "Expires today"
                      : `${d} days of coverage left`}
                </strong>
                <span>Coverage ends {dateFormat(item.warranty_end)}</span>
              </div>
            </div>
            <div className="coverage-progress">
              <span
                style={{
                  width: `${Math.max(4, Math.min(100, ((365 - Math.max(0, d)) / 365) * 100))}%`,
                }}
              />
            </div>
            <div className="coverage-labels">
              <span>
                Purchased{" "}
                {dateFormat(item.purchase_date, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>Warranty end</span>
            </div>
          </div>
          <div className="detail-card">
            <h3>Purchase details</h3>
            <div className="details-grid">
              <Info
                label="Purchase price"
                value={money(item.price, currency)}
              />
              <Info
                label="Purchase date"
                value={dateFormat(item.purchase_date)}
              />
              <Info label="Store" value={item.store || "—"} />
              <Info label="Category" value={item.category || "Other"} />
            </div>
            {item.support_url && (
              <a
                className="support-link"
                href={item.support_url}
                target="_blank"
                rel="noreferrer"
              >
                Visit {item.brand || "brand"} support <ArrowRight size={14} />
              </a>
            )}
            {item.notes && (
              <div className="notes-box">
                <span>NOTES</span>
                <p>{item.notes}</p>
              </div>
            )}
          </div>
          <div className="detail-card">
            <div className="detail-card-head">
              <h3>Receipt</h3>
              <button
                className="text-button"
                onClick={() =>
                  item.receipt_url
                    ? openReceipt(item.receipt_url)
                    : toast("No receipt uploaded yet")
                }
              >
                {item.receipt_url ? "View receipt" : "No receipt uploaded"}{" "}
                <ArrowRight size={14} />
              </button>
            </div>
            {item.receipt_url ? (
              <div className="receipt-card">
                <FileText size={19} />
                <div>
                  <b>Purchase receipt</b>
                  <span>Saved with this item</span>
                </div>
                <button
                  className="icon-button"
                  onClick={() => openReceipt(item.receipt_url)}
                >
                  <ArrowDownToLine size={17} />
                </button>
              </div>
            ) : (
              <div className="no-receipt">
                <FileImage size={20} />
                <span>Keep your proof of purchase close by.</span>
              </div>
            )}
          </div>
        </div>
        <aside className="detail-side">
          <div className="tip-card">
            <div className="tip-icon">
              <Bell size={18} />
            </div>
            <b>We’ll give you a heads-up.</b>
            <p>Get reminders 30, 7, and 1 day before this warranty expires.</p>
            <span>
              <Check size={13} /> Expiry reminders on
            </span>
          </div>
          <div className="support-card">
            <span className="eyebrow mini-eyebrow">NEED TO MAKE A CLAIM?</span>
            <h3>We’ll get the details ready.</h3>
            <p>Build a clear message with your purchase info and receipt.</p>
            <button className="primary-button" onClick={onClaim}>
              Open claim helper <ArrowRight size={15} />
            </button>
          </div>
          <button
            className="delete-button"
            onClick={() => {
              if (confirm(`Remove ${item.name} from your vault?`)) onDelete();
            }}
          >
            <Trash2 size={15} />
            Remove this item
          </button>
        </aside>
      </div>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div className="info-pair">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function ClaimModal({ item, onClose, toast }) {
  const [support, setSupport] = useState(item.support_email || "");
  const subject = `Warranty claim: ${item.name}`;
  const body = `Hello ${item.brand || "Support Team"},\n\nI would like to request warranty service for my ${item.name}.\n\nProduct: ${item.name}${item.brand ? ` (${item.brand})` : ""}\nPurchased from: ${item.store || "—"}\nPurchase date: ${dateFormat(item.purchase_date)}\nWarranty expiry: ${dateFormat(item.warranty_end)}\n${item.notes ? `\nAdditional details: ${item.notes}\n` : ""}\nI have attached my proof of purchase. Please let me know the next steps.\n\nThank you.`;
  const copy = async () => {
    await navigator.clipboard.writeText(
      `To: ${support}\nSubject: ${subject}\n\n${body}`,
    );
    toast("Claim message copied");
  };
  const send = () => {
    if (!support) {
      toast("Add a support email first");
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(support)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Email draft opened — attach your receipt before sending");
  };
  const downloadEmail = async () => {
    try {
      const blob = item.receipt_url
        ? await getReceiptBlob(item.receipt_url)
        : null;
      const boundary = `wv-${uid()}`;
      const headers = [
        `To: ${support}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        body,
      ];
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        const encoded = btoa(binary);
        const filename = blob.name || "receipt";
        headers.push(
          `--${boundary}`,
          `Content-Type: ${blob.type || "application/octet-stream"}; name="${filename}"`,
          `Content-Disposition: attachment; filename="${filename}"`,
          "Content-Transfer-Encoding: base64",
          "",
          encoded.match(/.{1,76}/g)?.join("\r\n") || "",
        );
      }
      headers.push(`--${boundary}--`);
      download(
        new Blob([headers.join("\r\n")], { type: "message/rfc822" }),
        "warranty-claim.eml",
      );
      toast(
        blob
          ? "Claim email downloaded with receipt attached"
          : "Claim email downloaded",
      );
    } catch (e) {
      toast(`Could not create email file: ${e.message}`);
    }
  };
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal claim-modal">
        <header className="modal-header">
          <div>
            <span className="eyebrow mini-eyebrow">CLAIM HELPER</span>
            <h2>Let’s get this sorted.</h2>
            <p>Your purchase details, ready to go.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <label className="field">
          Brand support email
          <input
            type="email"
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            placeholder="Enter the brand’s support address"
          />
        </label>
        <div className="claim-preview">
          <div className="claim-preview-head">
            <span>EMAIL PREVIEW</span>
            <button onClick={copy}>
              <Copy size={14} />
              Copy
            </button>
          </div>
          <b>Subject: {subject}</b>
          <p>{body}</p>
        </div>
        <div className="claim-receipt">
          <div className="receipt-mini">
            <FileText size={17} />
          </div>
          <div>
            <b>Proof of purchase</b>
            <span>
              {item.receipt_url
                ? "Receipt saved · attach it to your email"
                : "No receipt on file"}
            </span>
          </div>
          {item.receipt_url && (
            <button
              className="text-button"
              onClick={() => openReceipt(item.receipt_url)}
            >
              Open
            </button>
          )}
        </div>
        <div className="claim-footer">
          <span className="secure-note">
            <ShieldCheck size={14} />
            Review before sending
          </span>
          <button className="secondary-button" onClick={downloadEmail}>
            <Download size={15} /> Download email
            {item.receipt_url ? " + receipt" : ""}
          </button>
          <button className="primary-button" onClick={send}>
            <ArrowRight size={15} /> Open email draft
          </button>
        </div>
        <p className="claim-hint">
          Your email app will open with the message filled in. Attach your
          receipt before sending.
        </p>
      </section>
    </div>
  );
}
function AuthModal({ busy, onClose, onEmail, onGoogle }) {
  const [email, setEmail] = useState("");
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal account-auth-modal">
        <header className="modal-header">
          <div>
            <span className="eyebrow mini-eyebrow">YOUR PRIVATE VAULT</span>
            <h2>Sign in to sync</h2>
            <p>Use a magic link to access your items on any device.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <label className="field">
          Email address
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button
          className="primary-button"
          disabled={busy || !email}
          onClick={() => onEmail(email)}
        >
          {busy ? "Sending link…" : "Email me a sign-in link"}
        </button>
        <div className="auth-divider">or</div>
        <button className="secondary-button" onClick={onGoogle}>
          Continue with Google
        </button>
        <p className="integration-note">
          Sign-in requires Supabase credentials and enabled providers.
        </p>
      </section>
    </div>
  );
}
function SettingsPage({
  settings,
  setSettings,
  dark,
  setDark,
  user,
  signIn,
  toast,
  exportCsv,
  exportPdf,
  exportBundle,
}) {
  return (
    <div className="settings-page">
      <div className="eyebrow mini-eyebrow">PREFERENCES</div>
      <h1>Your vault, your way.</h1>
      <p className="settings-intro">
        Manage reminders, account access, and your data.
      </p>
      <div className="settings-layout">
        <div className="settings-main">
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <Bell size={18} />
              </span>
              <div>
                <b>Expiry reminders</b>
                <small>We’ll nudge you before a warranty ends.</small>
              </div>
            </div>
            <Toggle
              value={settings.alerts}
              onChange={(v) => setSettings({ ...settings, alerts: v })}
            />
            <div className="reminder-chips">
              {[30, 7, 1].map((n) => (
                <span key={n}>
                  <Check size={13} />
                  {n} days before
                </span>
              ))}
            </div>
            <button
              className="text-button settings-action"
              onClick={async () => {
                if (!("Notification" in window)) {
                  toast("Notifications are not supported in this browser");
                  return;
                }
                const p = await Notification.requestPermission();
                toast(
                  p === "granted"
                    ? "Notifications enabled"
                    : "Notifications blocked",
                );
              }}
            >
              Enable browser notifications <ArrowRight size={14} />
            </button>
          </div>
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <ArrowDownToLine size={18} />
              </span>
              <div>
                <b>Currency</b>
                <small>Used for prices and exports.</small>
              </div>
            </div>
            <select
              className="currency-setting"
              value={settings.currency || "INR"}
              onChange={(e) => setSettings({ currency: e.target.value })}
            >
              <option value="INR">INR · Indian rupee</option>
              <option value="USD">USD · US dollar</option>
              <option value="EUR">EUR · Euro</option>
              <option value="GBP">GBP · Pound sterling</option>
            </select>
          </div>
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <UserRound size={18} />
              </span>
              <div>
                <b>Account</b>
                <small>
                  {user
                    ? user.email
                    : "Use a secure link to access your vault on any device."}
                </small>
              </div>
            </div>
            {user ? (
              <span className="connected-badge">
                <span />
                Connected
              </span>
            ) : (
              <div className="account-buttons">
                <button
                  className="secondary-button"
                  onClick={() => signIn("email")}
                >
                  Continue with email
                </button>
                <button
                  className="secondary-button"
                  onClick={() => signIn("google")}
                >
                  Continue with Google
                </button>
              </div>
            )}
          </div>
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <Bell size={18} />
              </span>
              <div>
                <b>Email reminders</b>
                <small>Requires a configured email delivery service.</small>
              </div>
            </div>
            <label className="email-setting">
              <span>Send reminders to</span>
              <input
                type="email"
                value={settings.email || ""}
                placeholder="you@example.com"
                onChange={(e) => setSettings({ email: e.target.value })}
              />
            </label>
            <div className="settings-card-title">
              <div>
                <b>Enable email reminders</b>
              </div>
              <Toggle
                value={settings.emailAlerts}
                onChange={(v) => setSettings({ emailAlerts: v })}
              />
            </div>
            <p className="integration-note">
              Reminders are scheduled at 30, 7, and 1 day before expiry once the
              Supabase email function is configured.
            </p>
          </div>
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <Download size={18} />
              </span>
              <div>
                <b>Export your vault</b>
                <small>Keep a copy of your items and receipts.</small>
              </div>
            </div>
            <div className="export-actions">
              <button className="secondary-button" onClick={exportCsv}>
                CSV
              </button>
              <button className="secondary-button" onClick={exportPdf}>
                PDF
              </button>
              <button className="secondary-button" onClick={exportBundle}>
                ZIP + receipts
              </button>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-card-title">
              <span className="settings-icon">
                <Moon size={18} />
              </span>
              <div>
                <b>Appearance</b>
                <small>Choose a theme that feels right.</small>
              </div>
            </div>
            <div className="theme-options">
              <button
                className={!dark ? "chosen" : ""}
                onClick={() => setDark(false)}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                className={dark ? "chosen" : ""}
                onClick={() => setDark(true)}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>
        </div>
        <aside className="settings-aside">
          <div className="settings-card privacy-panel">
            <span className="eyebrow mini-eyebrow">YOUR DATA</span>
            <h3>Your receipts stay private.</h3>
            <p>
              Receipt images stay on this device in demo mode, or in your
              private Supabase storage when connected.
            </p>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={17} />
            <div>
              <b>Your information is yours.</b>
              <span>Receipts and item details are only visible to you.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      className={`toggle ${value ? "on" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span />
    </button>
  );
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function safeName(value) {
  return (
    String(value || "receipt")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 64) || "receipt"
  );
}
function extensionFor(url) {
  const match = String(url).match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
  return match?.[1]?.toLowerCase() || "pdf";
}
function itemsToCsv(items, currency = "INR") {
  const cols = [
    "name",
    "brand",
    "store",
    "price",
    "currency",
    "purchase_date",
    "warranty_end",
    "warranty_duration_months",
    "category",
    "notes",
    "support_email",
    "support_url",
    "receipt_url",
  ];
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    cols.map(esc).join(","),
    ...items.map((i) =>
      cols.map((c) => esc(c === "currency" ? currency : i[c])).join(","),
    ),
  ].join("\r\n");
}
async function getReceiptBlob(path) {
  if (path.startsWith("data:")) return await (await fetch(path)).blob();
  if (path.startsWith("local-receipt:")) {
    const id = path.slice(14);
    const db = await openReceiptDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction("files").objectStore("files").get(id);
      req.onsuccess = () =>
        req.result
          ? resolve(req.result)
          : reject(new Error("Receipt not found on this device"));
      req.onerror = () => reject(req.error);
    });
  }
  if (supabase) {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60);
    if (error) throw error;
    const response = await fetch(data.signedUrl);
    if (!response.ok) throw new Error("Receipt download failed");
    return response.blob();
  }
  const response = await fetch(path);
  if (!response.ok) throw new Error("Receipt unavailable");
  return response.blob();
}
function openReceiptDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("warranty-vault", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveDemoReceipt(file) {
  const id = uid();
  const db = await openReceiptDb();
  await new Promise((resolve, reject) => {
    const req = db
      .transaction("files", "readwrite")
      .objectStore("files")
      .put(file, id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  return `local-receipt:${id}`;
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function openReceipt(url) {
  if (url.startsWith("local-receipt:")) {
    getReceiptBlob(url)
      .then((blob) =>
        window.open(URL.createObjectURL(blob), "_blank", "noopener"),
      )
      .catch(() => {});
  } else if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "warranty-receipt";
    a.click();
  } else if (supabase) {
    supabase.storage
      .from("receipts")
      .createSignedUrl(url, 60)
      .then(
        ({ data }) =>
          data?.signedUrl && window.open(data.signedUrl, "_blank", "noopener"),
      );
  } else window.open(url, "_blank", "noopener");
}
function normalizeDate(raw) {
  const p = raw.split(/[/-]/);
  if (p.length !== 3) return daysFromNow(0);
  let [m, d, y] = p;
  if (Number(m) > 12) [m, d] = [d, m];
  if (y.length === 2) y = `20${y}`;
  const dt = new Date(
    `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00`,
  );
  return Number.isNaN(+dt) ? daysFromNow(0) : dt.toISOString().slice(0, 10);
}
