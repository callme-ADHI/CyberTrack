import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Inquiry, type Category, type Location } from "@/lib/supabase";
import { Skeleton, EmptyState } from "@/components/Skeleton";
import { RatingStars } from "@/components/CaseDetailModal";
import { format, startOfWeek, subDays } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/_app/feedback")({
  component: Feedback,
});

// ─── Client-only chart wrapper to prevent SSR crash ──────────────────────────
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="h-[220px] flex items-center justify-center text-[#5a6478] text-sm">
        Loading chart...
      </div>
    );
  return <>{children}</>;
}

function Feedback() {
  const { data, isLoading, error } = useQuery({
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
      const { data } = await supabase.from("categories").select("*");
      return (data || []) as Category[];
    },
  });
  const locationsQ = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("*");
      return (data || []) as Location[];
    },
  });

  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const all = data || [];

  const withFeedback = useMemo(
    () => all.filter((i) => i.feedback && i.feedback.trim().length > 0),
    [all],
  );

  const summary = useMemo(() => {
    const total = all.length;
    const avg = total ? all.reduce((s, i) => s + (i.rating || 0), 0) / total : 0;
    const dist = [1, 2, 3, 4, 5].map((r) => ({
      r,
      count: all.filter((i) => i.rating === r).length,
    }));
    const max = Math.max(1, ...dist.map((d) => d.count));
    const positive = total ? (all.filter((i) => i.rating >= 4).length / total) * 100 : 0;
    const negative = total ? (all.filter((i) => i.rating <= 2).length / total) * 100 : 0;
    return { total, avg, dist, max, positive, negative };
  }, [all]);

  const filtered = useMemo(() => {
    let list = withFeedback;
    if (ratingFilter !== null) list = list.filter((i) => i.rating === ratingFilter);
    if (catFilter) list = list.filter((i) => String(i.category_id) === catFilter);
    if (locFilter) list = list.filter((i) => String(i.location_id) === locFilter);
    if (from) list = list.filter((i) => new Date(i.created_at) >= new Date(from));
    if (to) list = list.filter((i) => new Date(i.created_at) <= new Date(to + "T23:59:59"));
    list = [...list];
    if (sort === "newest") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "high") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "low") list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [withFeedback, ratingFilter, catFilter, locFilter, from, to, sort]);

  const pageData = filtered.slice(0, page * PER_PAGE);

  // Trend data — computed client-only to avoid SSR/hydration mismatch
  const [trend, setTrend] = useState<{ week: string; avg: number }[]>([]);
  useEffect(() => {
    if (!all.length) return;
    const start = subDays(new Date(), 90);
    const buckets: Record<string, number[]> = {};
    all.forEach((i) => {
      if (!i.created_at) return;
      const d = new Date(i.created_at);
      if (isNaN(d.getTime()) || d < start) return;
      const wk = format(startOfWeek(d), "yyyy-MM-dd");
      if (!buckets[wk]) buckets[wk] = [];
      buckets[wk].push(i.rating || 0);
    });
    const result = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, rs]) => ({
        week: format(new Date(wk), "dd MMM"),
        avg: +(rs.reduce((s, x) => s + x, 0) / rs.length).toFixed(2),
      }));
    setTrend(result);
  }, [all]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <p className="text-[#c0392b] text-[14px]">Failed to load feedback data.</p>
        <p className="text-[#5a6478] text-[12px]">{(error as Error).message}</p>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Citizen Feedback</h1>
        <p className="text-[13px] text-[#5a6478]">Reviews, ratings, and satisfaction analytics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card-surface p-5 text-center">
          <div className="text-[48px] font-semibold text-[#0a1f44] leading-none tabular-nums">
            {summary.avg.toFixed(1)}
          </div>
          <div className="mt-2">
            <RatingStars rating={Math.round(summary.avg)} size={16} />
          </div>
          <div className="text-[12px] text-[#5a6478] mt-2">Overall Rating</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-[11px] uppercase tracking-wider text-[#5a6478]">Distribution</div>
          <div className="space-y-1.5 mt-3">
            {summary.dist
              .slice()
              .reverse()
              .map((d) => (
                <div key={d.r} className="flex items-center gap-2 text-[12px]">
                  <span className="w-6 text-[#5a6478]">{d.r}★</span>
                  <div className="flex-1 h-2 bg-[#f4f6f9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#c47d00] transition-all duration-700"
                      style={{ width: `${(d.count / summary.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-[#5a6478]">{d.count}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="card-surface p-5 flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wider text-[#5a6478]">Positive (4-5★)</div>
          <div className="text-[36px] font-semibold text-[#1a7a4a] tabular-nums">
            {summary.positive.toFixed(0)}%
          </div>
          <div className="text-[12px] text-[#5a6478] mt-1">
            {all.filter((i) => i.rating >= 4).length} responses
          </div>
        </div>
        <div className="card-surface p-5 flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wider text-[#5a6478]">Negative (1-2★)</div>
          <div className="text-[36px] font-semibold text-[#c0392b] tabular-nums">
            {summary.negative.toFixed(0)}%
          </div>
          <div className="text-[12px] text-[#5a6478] mt-1">
            {all.filter((i) => i.rating <= 2).length} responses
          </div>
        </div>
      </div>

      {/* Trend Chart — client-only to prevent SSR crash */}
      <div className="card-surface p-5">
        <h3 className="text-[15px] mb-3">Rating Trend (last 90 days)</h3>
        <ClientOnly>
          {trend.length === 0 ? (
            <EmptyState message="No trend data yet." />
          ) : (
            <TrendChart trend={trend} />
          )}
        </ClientOnly>
      </div>

      {/* Filters */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-[#5a6478]">Rating:</span>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
              className={`px-3 py-1 text-[12px] rounded-full border transition-colors ${
                ratingFilter === r
                  ? "bg-[#0a1f44] text-white border-[#0a1f44]"
                  : "border-[#e0e4ed] text-[#5a6478]"
              }`}
            >
              {r}★
            </button>
          ))}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md"
          >
            <option value="">All Categories</option>
            {(categoriesQ.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md"
          >
            <option value="">All Locations</option>
            {(locationsQ.data || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1 text-[12px] border border-[#e0e4ed] rounded-md"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1 text-[12px] border border-[#e0e4ed] rounded-md"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-[#e0e4ed] rounded-md ml-auto"
          >
            <option value="newest">Newest</option>
            <option value="high">Highest Rating</option>
            <option value="low">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Feedback cards */}
      {withFeedback.length === 0 ? (
        <div className="card-surface p-12">
          <EmptyState message="No feedback submitted yet." />
        </div>
      ) : pageData.length === 0 ? (
        <div className="card-surface p-12">
          <EmptyState message="No feedback found for selected filters." />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {pageData.map((f) => {
            const isLong = (f.feedback || "").length > 180;
            const show = expanded[f.id] || !isLong;
            return (
              <div key={f.id} className="card-surface card-hover p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[14px] font-medium text-[#0a1f44]">
                      {f.complainant_name?.split(" ")[0] || "Anon"}
                    </span>
                    <span className="text-[11px] text-[#5a6478] ml-2">
                      {f.created_at && !isNaN(new Date(f.created_at).getTime())
                        ? format(new Date(f.created_at), "dd MMM yyyy")
                        : "—"}
                    </span>
                  </div>
                  <RatingStars rating={f.rating} size={13} />
                </div>
                <p className="text-[13px] text-[#0d1b2a] leading-relaxed mb-3">
                  &ldquo;{show ? f.feedback : (f.feedback || "").slice(0, 180) + "..."}&rdquo;
                  {isLong && (
                    <button
                      onClick={() => setExpanded((x) => ({ ...x, [f.id]: !x[f.id] }))}
                      className="ml-1 text-[12px] text-[#8b0000] hover:underline"
                    >
                      {expanded[f.id] ? "Show less" : "Show more"}
                    </button>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {f.categories?.name && (
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#0a1f44]/10 text-[#0a1f44]">
                      {f.categories.name}
                    </span>
                  )}
                  {f.locations?.name && (
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-[#8b0000]/10 text-[#8b0000]">
                      {f.locations.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pageData.length < filtered.length && (
        <div className="text-center">
          <button onClick={() => setPage((p) => p + 1)} className="btn-ghost">
            Load more ({filtered.length - pageData.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

// Lazy-imported chart — only renders on client
function TrendChart({ trend }: { trend: { week: string; avg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={trend}>
        <defs>
          <linearGradient id="ratingGradFeedback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1f44" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0a1f44" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#5a6478" }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "#5a6478" }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="avg"
          stroke="#0a1f44"
          fill="url(#ratingGradFeedback)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
