import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Location, type Inquiry } from "@/lib/supabase";
import { Skeleton, EmptyState } from "@/components/Skeleton";
import { Plus, Edit2, Search, X, Trash2, AlertTriangle, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/locations")({
  component: Locations,
});

function Locations() {
  const qc = useQueryClient();
  const locQ = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").order("name");
      if (error) throw error;
      return (data || []) as Location[];
    },
  });

  const inqQ = useQuery({
    queryKey: ["inquiries", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("inquiries").select("id, location_id");
      return (data || []) as Pick<Inquiry, "id" | "location_id">[];
    },
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [taluk, setTaluk] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);

  const counts = useMemo(() => {
    const map: Record<number, number> = {};
    (inqQ.data || []).forEach((i) => {
      map[i.location_id] = (map[i.location_id] || 0) + 1;
    });
    return map;
  }, [inqQ.data]);

  const filtered = (locQ.data || []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.taluk.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !taluk.trim()) {
        throw new Error("Name and taluk are required");
      }
      const dup = (locQ.data || []).find(
        (l) => l.name.toLowerCase() === name.trim().toLowerCase() && l.id !== editing?.id
      );
      if (dup) throw new Error("A location with this name already exists");

      if (editing) {
        const { error } = await supabase
          .from("locations")
          .update({ name: name.trim(), taluk: taluk.trim() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("locations")
          .insert({ name: name.trim(), taluk: taluk.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Location updated" : "Location created");
      qc.invalidateQueries({ queryKey: ["locations"] });
      reset();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Location deleted");
      qc.invalidateQueries({ queryKey: ["locations"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => {
      toast.error("Failed to delete: " + e.message);
      setConfirmDelete(null);
    },
  });

  const reset = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setTaluk("");
    setErr("");
  };

  const startEdit = (l: Location) => {
    setEditing(l);
    setName(l.name);
    setTaluk(l.taluk || "");
    setShowForm(true);
    setErr("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl">Locations</h1>
          <p className="text-[13px] text-[#5a6478]">
            Manage geographical locations and taluks.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setName(""); setTaluk(""); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={14} /> New Location
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6478]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search locations or taluks..."
          className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
        />
      </div>

      {showForm && (
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px]">{editing ? "Edit Location" : "New Location"}</h3>
            <button onClick={reset} className="text-[#5a6478] hover:text-[#0a1f44]">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1">Location Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]" placeholder="e.g. Agali" />
            </div>
            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1">Taluk *</label>
              <input value={taluk} onChange={(e) => setTaluk(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]" placeholder="e.g. Mannarkkad" />
            </div>
            {err && <p className="text-[12px] text-[#c0392b]">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
                {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button onClick={reset} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {locQ.isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message="No locations found." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div key={l.id} className="card-surface card-hover p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#8b0000]" />
                  <h3 className="text-[15px] font-semibold text-[#0a1f44]">{l.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(l)}
                    className="p-1.5 rounded-md text-[#5a6478] hover:text-[#0a1f44] hover:bg-[#f4f6f9] transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(l)}
                    className="p-1.5 rounded-md text-[#5a6478] hover:text-[#c0392b] hover:bg-[#fdecea] transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-[13px] text-[#5a6478] mb-3">
                Taluk: <span className="font-medium text-[#0a1f44]">{l.taluk}</span>
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-[#e0e4ed]">
                <span className="text-[11px] text-[#5a6478] uppercase tracking-wider">Cases</span>
                <span className="text-[18px] font-semibold text-[#0a1f44] tabular-nums">
                  {counts[l.id] || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-xl max-w-sm w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fdecea] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-[#c0392b]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#0a1f44]">Delete Location</h3>
                <p className="text-[12px] text-[#5a6478]">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-[13px] text-[#0d1b2a] mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&ldquo;{confirmDelete.name}&rdquo;</span>?
            </p>
            {(counts[confirmDelete.id] || 0) > 0 && (
              <p className="text-[12px] text-[#c47d00] bg-[#fdf3e0] rounded-md px-3 py-2 mb-4">
                ⚠️ This location has {counts[confirmDelete.id]} linked case(s). Deleting it may affect those records.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
