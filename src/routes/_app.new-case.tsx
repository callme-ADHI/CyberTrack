import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Category, type Location } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft, Save, Star } from "lucide-react";

export const Route = createFileRoute("/_app/new-case")({
  component: NewCase,
});

function NewCase() {
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const [complainantName, setComplainantName] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [moneyLost, setMoneyLost] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!locationId) {
      setError("Please select a location.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        category_id: parseInt(categoryId, 10),
        location_id: parseInt(locationId, 10),
        description: description.trim(),
        complainant_name: complainantName.trim() || null,
        complainant_phone: complainantPhone.trim() || null,
        money_lost: moneyLost ? parseFloat(moneyLost) : null,
        rating: rating,
        feedback: feedback.trim() || null,
      };

      const { error: insertError } = await supabase.from("inquiries").insert(payload);
      if (insertError) throw insertError;

      toast.success("Case registered successfully!");
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      navigate({ to: "/cases" });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save the case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto page-fade">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/cases" })}
          className="p-2 rounded-md hover:bg-[#f4f6f9] text-[#5a6478] cursor-pointer transition-colors"
          title="Back to Cases"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#0a1f44]">New Case Registration</h1>
          <p className="text-[13px] text-[#5a6478]">
            Enter complaint details in accordance with Palakkad Cybercrime record standards.
          </p>
        </div>
      </div>

      <div className="card-surface p-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-[#fdecea] text-[#c0392b] text-[13px] rounded-md border border-[#f5c6cb]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Category / Crime Type *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white cursor-pointer"
                required
              >
                <option value="">Select Crime Category</option>
                {(categoriesQ.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Location *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white cursor-pointer"
                required
              >
                <option value="">Select Location</option>
                {(locationsQ.data || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.taluk})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Complainant Name (Optional)
              </label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
                placeholder="Enter complainant's full name"
              />
            </div>

            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Complainant Phone (Optional)
              </label>
              <input
                type="tel"
                value={complainantPhone}
                onChange={(e) => setComplainantPhone(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Money Lost (₹)
              </label>
              <input
                type="number"
                value={moneyLost}
                onChange={(e) => setMoneyLost(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44]"
                placeholder="e.g. 15000"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
                Rating (1-5★)
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? null : s)}
                    className="p-1 hover:scale-110 transition-transform duration-100 cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={
                        s <= (rating || 0)
                          ? "fill-[#c47d00] text-[#c47d00]"
                          : "text-[#e0e4ed] hover:text-[#c47d00]"
                      }
                    />
                  </button>
                ))}
                {rating !== null && (
                  <span className="text-[12px] text-[#5a6478] ml-2 font-medium">
                    {rating === 1 && "1★ (Very Dissatisfied)"}
                    {rating === 2 && "2★ (Dissatisfied)"}
                    {rating === 3 && "3★ (Neutral)"}
                    {rating === 4 && "4★ (Satisfied)"}
                    {rating === 5 && "5★ (Very Satisfied)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] leading-relaxed"
              placeholder="Describe the incident in detail..."
              required
            />
          </div>

          <div>
            <label className="text-[12px] text-[#5a6478] block mb-1 font-medium">
              Officer Notes / Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] leading-relaxed"
              placeholder="Add any investigation notes, initial feedback, or citizen remarks..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e0e4ed]">
            <button
              type="button"
              onClick={() => navigate({ to: "/cases" })}
              className="btn-ghost cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-1.5 cursor-pointer"
              disabled={isSubmitting}
            >
              <Save size={14} />
              {isSubmitting ? "Registering..." : "Register Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
