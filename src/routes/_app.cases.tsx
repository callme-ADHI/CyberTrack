import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, type Inquiry, type Category, type Location } from "@/lib/supabase";
import { CaseDetailModal, maskPhone, RatingStars } from "@/components/CaseDetailModal";
import { AddCaseModal } from "@/components/AddCaseModal";
import { Skeleton, EmptyState } from "@/components/Skeleton";
import { Search, Download, X, Plus } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/cases")({
  component: AllCases,
});

function AllCases() {
  const navigate = useNavigate();
  const inquiriesQ = useQuery({
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
  const locationsQ = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("*").order("name");
      return (data || []) as Location[];
    },
  });

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [loc, setLoc] = useState("");
  const [taluk, setTaluk] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [minLoss, setMinLoss] = useState("");
  const [maxLoss, setMaxLoss] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inquiryToEdit, setInquiryToEdit] = useState<Inquiry | null>(null);
  const PER_PAGE = 25;

  const taluks = useMemo(() => {
    const s = new Set<string>();
    (locationsQ.data || []).forEach((l) => l.taluk && s.add(l.taluk));
    return Array.from(s).sort();
  }, [locationsQ.data]);

  const filtered = useMemo(() => {
    let list = inquiriesQ.data || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.complainant_name?.toLowerCase().includes(q) ||
          i.complainant_phone?.includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    }
    if (cat) list = list.filter((i) => String(i.category_id) === cat);
    if (loc) list = list.filter((i) => String(i.location_id) === loc);
    if (taluk) list = list.filter((i) => i.locations?.taluk === taluk);
    if (from) list = list.filter((i) => new Date(i.created_at) >= new Date(from));
    if (to) list = list.filter((i) => new Date(i.created_at) <= new Date(to + "T23:59:59"));
    if (rating !== null) list = list.filter((i) => i.rating === rating);
    if (minLoss)
      list = list.filter((i) => i.money_lost !== null && i.money_lost >= Number(minLoss));
    if (maxLoss)
      list = list.filter((i) => i.money_lost !== null && i.money_lost <= Number(maxLoss));

    list = [...list];
    if (sort === "newest") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "oldest")
      list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "rating-high") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "rating-low") list.sort((a, b) => a.rating - b.rating);
    return list;
  }, [inquiriesQ.data, search, cat, loc, taluk, from, to, rating, minLoss, maxLoss, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setCat("");
    setLoc("");
    setTaluk("");
    setFrom("");
    setTo("");
    setRating(null);
    setMinLoss("");
    setMaxLoss("");
    setPage(1);
  };

  const exportCSV = () => {
    const headers = [
      "Case ID",
      "Complainant",
      "Phone",
      "Category",
      "Location",
      "Taluk",
      "Rating",
      "Money Lost",
      "Date",
    ];
    const rows = filtered.map((i) => [
      i.id,
      i.complainant_name,
      i.complainant_phone,
      i.categories?.name || "",
      i.locations?.name || "",
      i.locations?.taluk || "",
      i.rating,
      i.money_lost || 0,
      format(new Date(i.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cases-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl">All Cases</h1>
          <p className="text-[13px] text-[#5a6478]">
            Showing {pageData.length} of {total} cases
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ to: "/new-case" })}
            className="btn-primary flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> New Case
          </button>
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 cursor-pointer">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="card-surface p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6478]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, description..."
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          >
            <option value="">All Categories</option>
            {(categoriesQ.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={loc}
            onChange={(e) => {
              setLoc(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          >
            <option value="">All Locations</option>
            {(locationsQ.data || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={taluk}
            onChange={(e) => {
              setTaluk(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          >
            <option value="">All Taluks</option>
            {taluks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min ₹"
              value={minLoss}
              onChange={(e) => {
                setMinLoss(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
            />
            <span className="text-[#5a6478]">-</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxLoss}
              onChange={(e) => {
                setMaxLoss(e.target.value);
                setPage(1);
              }}
              className="w-20 px-2 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rating-high">Rating High-Low</option>
            <option value="rating-low">Rating Low-High</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-[#5a6478]">Rating:</span>
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRating(rating === r ? null : r)}
              className={`px-3 py-1 text-[12px] rounded-full border transition-colors ${
                rating === r
                  ? "bg-[#0a1f44] text-white border-[#0a1f44]"
                  : "border-[#e0e4ed] text-[#5a6478] hover:border-[#0a1f44]"
              }`}
            >
              {r}★
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="ml-auto text-[12px] text-[#8b0000] flex items-center gap-1 hover:underline"
          >
            <X size={12} /> Clear filters
          </button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        {inquiriesQ.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : pageData.length === 0 ? (
          <EmptyState message="No cases match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[#5a6478] bg-[#f4f6f9]">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Case ID</th>
                  <th className="px-3 py-2.5 font-medium">Complainant</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Location</th>
                  <th className="px-3 py-2.5 font-medium">Taluk</th>
                  <th className="px-3 py-2.5 font-medium text-right">Loss (₹)</th>
                  <th className="px-3 py-2.5 font-medium">Rating</th>
                  <th className="px-3 py-2.5 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((i, idx) => {
                  const ratingBg =
                    i.rating <= 2
                      ? "bg-[#fdecea] text-[#c0392b]"
                      : i.rating === 3
                        ? "bg-[#fdf3e0] text-[#c47d00]"
                        : "bg-[#e6f4ec] text-[#1a7a4a]";
                  return (
                    <tr
                      key={i.id}
                      onClick={() => setSelected(i)}
                      className="cursor-pointer border-t border-[#e0e4ed] hover:bg-[#f8f9fc] transition-colors"
                    >
                      <td className="px-3 py-2.5 text-[#5a6478]">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </td>
                      <td className="px-3 py-2.5 font-medium">#{i.id}</td>
                      <td className="px-3 py-2.5">{i.complainant_name}</td>
                      <td className="px-3 py-2.5 tabular-nums">{maskPhone(i.complainant_phone)}</td>
                      <td className="px-3 py-2.5">{i.categories?.name || "—"}</td>
                      <td className="px-3 py-2.5">{i.locations?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-[#5a6478]">{i.locations?.taluk || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#c0392b]">
                        {i.money_lost ? i.money_lost.toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${ratingBg}`}
                        >
                          {i.rating}★
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-[#5a6478]">
                        {format(new Date(i.created_at), "dd MMM yyyy, HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-[#e0e4ed]">
            <span className="text-[12px] text-[#5a6478]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                return start + i;
              })
                .filter((p) => p <= totalPages)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-[12px] rounded-md ${
                      p === page ? "bg-[#0a1f44] text-white" : "hover:bg-[#f4f6f9] text-[#5a6478]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
