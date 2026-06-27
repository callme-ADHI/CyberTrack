import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Inquiry } from "@/lib/supabase";
import { CaseDetailModal, maskPhone, RatingStars } from "@/components/CaseDetailModal";
import { AddCaseModal } from "@/components/AddCaseModal";
import { Skeleton, EmptyState } from "@/components/Skeleton";
import {
  CalendarDays,
  CalendarRange,
  Database,
  Star,
  MapPin,
  AlertTriangle,
  Plus,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { colorFor } from "@/lib/colors";
import { format, startOfDay, startOfMonth } from "date-fns";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function useInquiries() {
  return useQuery({
    queryKey: ["inquiries", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*, categories(*), locations(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Inquiry[];
    },
    refetchInterval: 60_000,
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useInquiries();
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inquiryToEdit, setInquiryToEdit] = useState<Inquiry | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const all = data || [];
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const monthStart = startOfMonth(now).getTime();
    const today = all.filter((i) => new Date(i.created_at).getTime() >= todayStart);
    const month = all.filter((i) => new Date(i.created_at).getTime() >= monthStart);
    const avgRating =
      all.length > 0 ? all.reduce((s, i) => s + (i.rating || 0), 0) / all.length : 0;

    const locCount: Record<string, number> = {};
    today.forEach((i) => {
      const n = i.locations?.name || "—";
      locCount[n] = (locCount[n] || 0) + 1;
    });
    const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0];

    const catCount: Record<string, number> = {};
    today.forEach((i) => {
      const n = i.categories?.name || "—";
      catCount[n] = (catCount[n] || 0) + 1;
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    const catChart = Object.entries(catCount).map(([name, value]) => ({ name, value }));

    const hours: { hour: string; count: number }[] = Array.from({ length: 24 }, (_, h) => ({
      hour: String(h).padStart(2, "0"),
      count: 0,
    }));
    today.forEach((i) => {
      const h = new Date(i.created_at).getHours();
      hours[h].count++;
    });

    return {
      todayCount: today.length,
      monthCount: month.length,
      allCount: all.length,
      avgRating,
      topLoc: topLoc ? topLoc[0] : "—",
      topCat: topCat ? topCat[0] : "—",
      today,
      catChart,
      hours,
    };
  }, [data, tick]);

  if (isLoading) return <LoadingDashboard />;
  if (error)
    return (
      <div className="text-[#c0392b] flex items-center gap-2">
        <AlertTriangle size={16} /> Failed to load data: {(error as Error).message}
      </div>
    );

  const recentFeedback = (data || [])
    .filter((i) => i.feedback && i.feedback.trim().length > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl">Dashboard</h1>
          <p className="text-[13px] text-[#5a6478]">
            Real-time overview of cybercrime complaints across Kerala.
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/new-case" })}
          className="btn-primary flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} /> New Case
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          icon={<CalendarDays size={18} />}
          label="Cases Today"
          value={stats.todayCount}
        />
        <MetricCard
          icon={<CalendarRange size={18} />}
          label="This Month"
          value={stats.monthCount}
        />
        <MetricCard icon={<Database size={18} />} label="All Time" value={stats.allCount} />
        <MetricCard
          icon={<Star size={18} />}
          label="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          extra={<RatingStars rating={Math.round(stats.avgRating)} size={12} />}
        />
        <MetricCard
          icon={<MapPin size={18} />}
          label="Top Location Today"
          value={stats.topLoc}
          small
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Top Crime Today"
          value={stats.topCat}
          small
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-surface lg:col-span-2 p-5">
          <h3 className="text-[15px] mb-1">Today's Cases</h3>
          <p className="text-[12px] text-[#5a6478] mb-4">Live feed · refreshes every 60s</p>
          {stats.today.length === 0 ? (
            <EmptyState message="No cases reported today yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[#5a6478] bg-[#f4f6f9]">
                    <th className="px-3 py-2 font-medium">Case ID</th>
                    <th className="px-3 py-2 font-medium">Complainant</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.today.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => setSelected(i)}
                      className="cursor-pointer border-t border-[#e0e4ed] hover:bg-[#f8f9fc] transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium">#{i.id}</td>
                      <td className="px-3 py-2.5">{i.complainant_name}</td>
                      <td className="px-3 py-2.5">{i.categories?.name || "—"}</td>
                      <td className="px-3 py-2.5">{i.locations?.name || "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {format(new Date(i.created_at), "HH:mm")}
                      </td>
                      <td className="px-3 py-2.5">
                        <RatingStars rating={i.rating} size={12} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h3 className="text-[15px] mb-4">Today by Category</h3>
          {stats.catChart.length === 0 ? (
            <EmptyState message="No data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats.catChart}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.catChart.map((_, idx) => (
                    <Cell key={idx} fill={colorFor(idx)} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-surface lg:col-span-2 p-5">
          <h3 className="text-[15px] mb-4">Hourly Activity (Today)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.hours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#5a6478" }} />
              <YAxis tick={{ fontSize: 11, fill: "#5a6478" }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0a1f44" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-[15px] mb-3">Recent Feedback</h3>
          {recentFeedback.length === 0 ? (
            <EmptyState message="No feedback yet." />
          ) : (
            <ul className="space-y-3">
              {recentFeedback.map((f) => (
                <li key={f.id} className="border-b border-[#e0e4ed] pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">
                      {f.complainant_name?.split(" ")[0] || "Anon"}
                    </span>
                    <RatingStars rating={f.rating} size={11} />
                  </div>
                  <p className="text-[12px] text-[#5a6478] line-clamp-2">{f.feedback}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CaseDetailModal
        inquiry={selected}
        onClose={() => setSelected(null)}
        onEdit={() => {
          setInquiryToEdit(selected);
          setSelected(null);
          setIsAddModalOpen(true);
        }}
      />

      <AddCaseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setInquiryToEdit(null);
        }}
        inquiryToEdit={inquiryToEdit}
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  extra,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  extra?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="card-surface card-hover p-4">
      <div className="flex items-center justify-between text-[#5a6478] mb-2">
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
        <span className="text-[#0a1f44]">{icon}</span>
      </div>
      <div
        className={`text-[#0a1f44] font-semibold ${
          small ? "text-[15px] truncate" : "text-2xl tabular-nums"
        }`}
      >
        {value}
      </div>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
