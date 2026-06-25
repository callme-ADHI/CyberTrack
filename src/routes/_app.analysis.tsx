import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Inquiry, type Category } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";
import { colorFor } from "@/lib/colors";
import {
  format, startOfDay, startOfWeek, startOfMonth, startOfYear,
  subDays, eachDayOfInterval,
} from "date-fns";
import { Download, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { exportDataToPDF } from "@/lib/exportPDF";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

export const Route = createFileRoute("/_app/analysis")({
  component: Analysis,
});

type Preset = "today" | "week" | "month" | "year" | "custom";

// Client-only wrapper — prevents recharts SSR crash
function ClientChart({ children, height = 260 }: { children: React.ReactNode; height?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div
        className="flex items-center justify-center text-[#5a6478] text-[12px]"
        style={{ height }}
      >
        Loading chart…
      </div>
    );
  return <>{children}</>;
}

// Animated counter
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = value;
    const step = Math.ceil(target / 30);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setDisplay(cur);
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

function Analysis() {
  const { data, isLoading } = useQuery({
    queryKey: ["inquiries", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*, categories(*), locations(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Inquiry[];
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return (data || []) as Category[];
    },
  });

  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("");
  const [moneyLossFilter, setMoneyLossFilter] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (preset === "today") start = startOfDay(now);
    else if (preset === "week") start = startOfWeek(now);
    else if (preset === "month") start = startOfMonth(now);
    else if (preset === "year") start = startOfYear(now);
    else if (preset === "custom" && from) start = new Date(from);
    else start = startOfMonth(now);
    const end = preset === "custom" && to ? new Date(to + "T23:59:59") : now;
    return { start, end };
  }, [preset, from, to]);

  const filtered = useMemo(() => {
    return (data || []).filter((i) => {
      const t = new Date(i.created_at).getTime();
      if (t < range.start.getTime() || t > range.end.getTime()) return false;
      if (cat && String(i.category_id) !== cat) return false;
      if (moneyLossFilter === "low" && (i.money_lost === null || i.money_lost >= 10000)) return false;
      if (moneyLossFilter === "mid" && (i.money_lost === null || i.money_lost < 10000 || i.money_lost >= 50000)) return false;
      if (moneyLossFilter === "high" && (i.money_lost === null || i.money_lost < 50000 || i.money_lost >= 100000)) return false;
      if (moneyLossFilter === "severe" && (i.money_lost === null || i.money_lost < 100000)) return false;
      return true;
    });
  }, [data, range, cat, moneyLossFilter]);

  const prevPeriod = useMemo(() => {
    const span = range.end.getTime() - range.start.getTime();
    const pStart = new Date(range.start.getTime() - span);
    return (data || []).filter((i) => {
      const t = new Date(i.created_at).getTime();
      if (t < pStart.getTime() || t >= range.start.getTime()) return false;
      if (cat && String(i.category_id) !== cat) return false;
      if (moneyLossFilter === "low" && (i.money_lost === null || i.money_lost >= 10000)) return false;
      if (moneyLossFilter === "mid" && (i.money_lost === null || i.money_lost < 10000 || i.money_lost >= 50000)) return false;
      if (moneyLossFilter === "high" && (i.money_lost === null || i.money_lost < 50000 || i.money_lost >= 100000)) return false;
      if (moneyLossFilter === "severe" && (i.money_lost === null || i.money_lost < 100000)) return false;
      return true;
    });
  }, [data, range, cat, moneyLossFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const avgRating = total > 0 ? filtered.reduce((s, i) => s + (i.rating || 0), 0) / total : 0;

    const catCount: Record<string, { count: number; ratings: number[] }> = {};
    filtered.forEach((i) => {
      const n = i.categories?.name || "—";
      if (!catCount[n]) catCount[n] = { count: 0, ratings: [] };
      catCount[n].count++;
      catCount[n].ratings.push(i.rating || 0);
    });
    const categories = Object.entries(catCount)
      .map(([name, v]) => ({
        name,
        count: v.count,
        pct: total ? (v.count / total) * 100 : 0,
        avgRating: v.ratings.length ? v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const locCount: Record<string, { count: number; taluk: string; ratings: number[] }> = {};
    filtered.forEach((i) => {
      const n = i.locations?.name || "—";
      if (!locCount[n]) locCount[n] = { count: 0, taluk: i.locations?.taluk || "—", ratings: [] };
      locCount[n].count++;
      locCount[n].ratings.push(i.rating || 0);
    });
    const locations = Object.entries(locCount)
      .map(([name, v]) => ({
        name, taluk: v.taluk, count: v.count,
        pct: total ? (v.count / total) * 100 : 0,
        avgRating: v.ratings.length ? v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const days = eachDayOfInterval({ start: range.start, end: range.end });
    const daily: Record<string, number> = {};
    days.forEach((d) => (daily[format(d, "yyyy-MM-dd")] = 0));
    filtered.forEach((i) => {
      const k = format(new Date(i.created_at), "yyyy-MM-dd");
      if (k in daily) daily[k]++;
    });
    const dailySeries = Object.entries(daily).map(([date, count]) => ({
      date: format(new Date(date), "dd MMM"),
      count,
    }));

    const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
      rating: `${r}★`,
      count: filtered.filter((i) => i.rating === r).length,
    }));
    const satisfaction = total ? (filtered.filter((i) => i.rating >= 4).length / total) * 100 : 0;

    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dow = dowNames.map((d) => ({ day: d, count: 0 }));
    filtered.forEach((i) => { dow[new Date(i.created_at).getDay()].count++; });

    const topCats = categories.slice(0, 8).map((c) => c.name);
    const topLocs = locations.slice(0, 6).map((l) => l.name);
    const heat: number[][] = topCats.map(() => topLocs.map(() => 0));
    filtered.forEach((i) => {
      const ci = topCats.indexOf(i.categories?.name || "—");
      const li = topLocs.indexOf(i.locations?.name || "—");
      if (ci >= 0 && li >= 0) heat[ci][li]++;
    });
    const maxHeat = Math.max(1, ...heat.flat());
    const pctChange = prevPeriod.length === 0 ? 100 : ((total - prevPeriod.length) / prevPeriod.length) * 100;

    return { total, avgRating, topCat: categories[0]?.name || "—", topLoc: locations[0]?.name || "—", categories, locations, dailySeries, ratingDist, satisfaction, dow, topCats, topLocs, heat, maxHeat, pctChange };
  }, [filtered, prevPeriod, range]);

  const downloadPDF = async () => {
    setExporting(true);
    try { 
      const rangeStr = `${format(range.start, "dd MMM yyyy")} - ${format(range.end, "dd MMM yyyy")}`;
      exportDataToPDF(stats, rangeStr, `cyber-cell-report-${format(new Date(), "yyyy-MM-dd")}.pdf`); 
    }
    finally { setExporting(false); }
  };

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-80" />
    </div>
  );

  const presets: { k: Preset; label: string }[] = [
    { k: "today", label: "Today" },
    { k: "week", label: "This Week" },
    { k: "month", label: "This Month" },
    { k: "year", label: "This Year" },
    { k: "custom", label: "Custom Range" },
  ];

  const trendIcon = stats.pctChange > 5
    ? <TrendingUp size={14} className="text-[#c0392b]" />
    : stats.pctChange < -5
    ? <TrendingDown size={14} className="text-[#1a7a4a]" />
    : <Minus size={14} className="text-[#5a6478]" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl">Intelligence Analysis</h1>
          <p className="text-[13px] text-[#5a6478]">
            {format(range.start, "dd MMM yyyy")} → {format(range.end, "dd MMM yyyy")}
          </p>
        </div>
        <button onClick={downloadPDF} disabled={exporting} className="btn-danger flex items-center gap-2">
          <Download size={14} /> {exporting ? "Generating…" : "Download Report"}
        </button>
      </div>

      {/* Preset tabs + date pickers */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {presets.map((p) => (
            <button
              key={p.k}
              onClick={() => setPreset(p.k)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-all duration-150 font-medium ${
                preset === p.k
                  ? "bg-[#0a1f44] text-white shadow-sm"
                  : "text-[#5a6478] hover:bg-[#f4f6f9]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Always-visible dual date picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar size={14} className="text-[#5a6478]" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#5a6478] uppercase tracking-wider">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }}
              className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white"
            />
          </div>
          <span className="text-[#5a6478]">→</span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#5a6478] uppercase tracking-wider">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset("custom"); }}
              className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white"
            />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white">
            <option value="">All Categories</option>
            {(categoriesQ.data || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={moneyLossFilter} onChange={(e) => setMoneyLossFilter(e.target.value)} className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white">
            <option value="">Any Amount</option>
            <option value="low">&lt; ₹10,000</option>
            <option value="mid">₹10K - ₹50K</option>
            <option value="high">₹50K - ₹1L</option>
            <option value="severe">&gt; ₹1L</option>
          </select>
          {(from || to || cat || moneyLossFilter) && (
            <button onClick={() => { setFrom(""); setTo(""); setCat(""); setMoneyLossFilter(""); setPreset("month"); }} className="text-[11px] text-[#8b0000] hover:underline">
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard label="Total Cases" value={<AnimatedNumber value={stats.total} />} accent="#0a1f44" />
          <KPICard label="Avg Rating" value={<>{stats.avgRating.toFixed(2)}<span className="text-[14px] ml-0.5">/ 5</span></>} accent="#c47d00" />
          <KPICard label="Satisfaction" value={<AnimatedNumber value={Math.round(stats.satisfaction)} suffix="%" />} accent="#1a7a4a" />
          <KPICard label="Top Category" value={<span className="text-[15px] truncate">{stats.topCat}</span>} accent="#8b0000" small />
          <KPICard
            label="vs Prior Period"
            value={<span className={stats.pctChange > 0 ? "text-[#c0392b]" : "text-[#1a7a4a]"}>
              {stats.pctChange > 0 ? "+" : ""}{stats.pctChange.toFixed(1)}%
            </span>}
            accent="#5a6478"
            icon={trendIcon}
          />
        </div>

        {/* Cases Over Time */}
        <Section title="Cases Over Time" subtitle={`${stats.total} cases in selected period`}>
          <ClientChart height={260}>
            <CasesOverTimeChart data={stats.dailySeries} />
          </ClientChart>
        </Section>

        {/* Category + Rating side by side */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Crime Category Breakdown" subtitle="By volume">
            <ClientChart height={Math.max(180, stats.categories.length * 32)}>
              <CategoryChart data={stats.categories} />
            </ClientChart>
          </Section>

          <Section title="Rating Distribution" subtitle={`${stats.satisfaction.toFixed(0)}% satisfaction rate`}>
            <ClientChart height={220}>
              <RatingChart data={stats.ratingDist} />
            </ClientChart>
          </Section>
        </div>

        {/* Top Locations */}
        <Section title="Top Locations" subtitle="Highest complaint volume">
          <ClientChart height={280}>
            <LocationChart data={stats.locations.slice(0, 10)} />
          </ClientChart>
        </Section>

        {/* Heatmap */}
        {stats.topCats.length > 0 && stats.topLocs.length > 0 && (
          <Section title="Category × Location Heatmap" subtitle="Intersection density">
            <div className="overflow-x-auto">
              <table className="text-[11px] border-collapse w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-left min-w-[120px]"></th>
                    {stats.topLocs.map((l) => (
                      <th key={l} className="p-2 text-[#5a6478] font-medium text-center min-w-[80px] text-[10px]">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.topCats.map((c, ci) => (
                    <tr key={c}>
                      <td className="p-2 text-[#5a6478] font-medium text-right pr-3 text-[10px]">{c}</td>
                      {stats.topLocs.map((l, li) => {
                        const v = stats.heat[ci][li];
                        const alpha = v === 0 ? 0.04 : 0.15 + (v / stats.maxHeat) * 0.75;
                        return (
                          <td key={l} className="p-1 text-center">
                            <div
                              className="rounded-md py-1.5 text-[11px] font-medium transition-all"
                              style={{
                                background: `rgba(139,0,0,${alpha})`,
                                color: alpha > 0.4 ? "#fff" : "#8b0000",
                              }}
                              title={`${c} × ${l}: ${v}`}
                            >
                              {v || ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Day of week */}
        <Section title="Weekly Pattern" subtitle="Cases by day of week">
          <ClientChart height={220}>
            <WeeklyChart data={stats.dow} />
          </ClientChart>
        </Section>

        {/* Category table */}
        <Section title="Category Detail Table" subtitle="Full breakdown with ratings">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[#f4f6f9] text-[#5a6478]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Count</th>
                  <th className="px-3 py-2 text-right font-medium">% of Total</th>
                  <th className="px-3 py-2 text-right font-medium">Avg Rating</th>
                  <th className="px-3 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {stats.categories.map((c, i) => (
                  <tr key={c.name} className="border-t border-[#e0e4ed] hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-3 py-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorFor(i) }} />
                      {c.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{c.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.avgRating.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="h-1.5 bg-[#f4f6f9] rounded-full overflow-hidden w-full min-w-[80px]">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, background: colorFor(i) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Chart components (client-only via ClientChart wrapper) ──────────────────

function CasesOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0a1f44" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0a1f44" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5a6478" }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "#5a6478" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e0e4ed" }} />
        <Area isAnimationActive={false} type="monotone" dataKey="count" stroke="#0a1f44" strokeWidth={2.5} fill="url(#caseGrad)" dot={false} activeDot={{ r: 4, fill: "#0a1f44" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CategoryChart({ data }: { data: { name: string; count: number; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#5a6478" }} allowDecimals={false} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#5a6478" }} width={120} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v, "Cases"]} />
        <Bar isAnimationActive={false} dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colorFor(i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RatingChart({ data }: { data: { rating: string; count: number }[] }) {
  const colors = ["#c0392b", "#e67e22", "#c47d00", "#27ae60", "#1a7a4a"];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
        <XAxis dataKey="rating" tick={{ fontSize: 11, fill: "#5a6478" }} />
        <YAxis tick={{ fontSize: 10, fill: "#5a6478" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar isAnimationActive={false} dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function LocationChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 50, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5a6478" }} angle={-30} textAnchor="end" height={70} />
        <YAxis tick={{ fontSize: 10, fill: "#5a6478" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar isAnimationActive={false} dataKey="count" fill="#8b0000" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WeeklyChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5a6478" }} />
        <YAxis tick={{ fontSize: 10, fill: "#5a6478" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar isAnimationActive={false} dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={`rgba(10,31,68,${0.3 + (d.count / max) * 0.7})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Layout components ───────────────────────────────────────────────────────

function KPICard({ label, value, accent, small, icon }: {
  label: string; value: React.ReactNode; accent: string; small?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div className="card-surface card-hover p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-[12px]" style={{ background: accent }} />
      <div className="text-[11px] uppercase tracking-wider text-[#5a6478] mb-2 flex items-center gap-1">
        {label} {icon}
      </div>
      <div className={`font-semibold text-[#0a1f44] ${small ? "text-[15px] leading-tight" : "text-[28px] tabular-nums leading-none"}`}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-6">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#0a1f44]">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#5a6478] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
