import { useState, useEffect } from "react";
import { X, Star, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Category, type Location, type Inquiry } from "@/lib/supabase";
import { toast } from "sonner";

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryToEdit?: Inquiry | null;
}

export function AddCaseModal({ isOpen, onClose, inquiryToEdit }: AddCaseModalProps) {
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
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load editing inquiry details if provided
  useEffect(() => {
    if (inquiryToEdit) {
      setComplainantName(inquiryToEdit.complainant_name || "");
      setComplainantPhone(inquiryToEdit.complainant_phone || "");
      setCategoryId(String(inquiryToEdit.category_id || ""));
      setLocationId(String(inquiryToEdit.location_id || ""));
      setDescription(inquiryToEdit.description || "");
      setMoneyLost(inquiryToEdit.money_lost !== null ? String(inquiryToEdit.money_lost) : "");
      setRating(inquiryToEdit.rating ?? 5);
      setFeedback(inquiryToEdit.feedback || "");
    } else {
      resetForm();
    }
  }, [inquiryToEdit, isOpen]);

  const resetForm = () => {
    setComplainantName("");
    setComplainantPhone("");
    setCategoryId("");
    setLocationId("");
    setDescription("");
    setMoneyLost("");
    setRating(5);
    setFeedback("");
    setError("");
  };

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
        complainant_name: complainantName.trim() || null,
        complainant_phone: complainantPhone.trim() || null,
        category_id: parseInt(categoryId, 10),
        location_id: parseInt(locationId, 10),
        description: description.trim(),
        money_lost: moneyLost ? parseFloat(moneyLost) : null,
        rating: rating,
        feedback: feedback.trim() || null,
      };

      if (inquiryToEdit) {
        const { error: updateError } = await supabase
          .from("inquiries")
          .update(payload)
          .eq("id", inquiryToEdit.id);

        if (updateError) throw updateError;
        toast.success("Case successfully updated!");
      } else {
        const { error: insertError } = await supabase.from("inquiries").insert(payload);

        if (insertError) throw insertError;
        toast.success("New case successfully registered!");
      }

      qc.invalidateQueries({ queryKey: ["inquiries"] });
      resetForm();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save the case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-[#e0e4ed] sticky top-0 bg-white z-10">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#5a6478]">
              {inquiryToEdit ? "Update Details" : "Register"}
            </p>
            <h2 className="text-xl font-semibold text-[#0a1f44]">
              {inquiryToEdit ? `Edit Case #${inquiryToEdit.id}` : "New Complaint / Case"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[#f4f6f9] text-[#5a6478] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#fdecea] text-[#c0392b] text-[13px] rounded-md border border-[#f5c6cb]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#5a6478] block mb-1">
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
              <label className="text-[12px] text-[#5a6478] block mb-1">
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
              <label className="text-[12px] text-[#5a6478] block mb-1">
                Category / Crime Type *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white"
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
              <label className="text-[12px] text-[#5a6478] block mb-1">Location *</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] bg-white"
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
              <label className="text-[12px] text-[#5a6478] block mb-1">Money Lost (₹)</label>
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
              <label className="text-[12px] text-[#5a6478] block mb-1">
                Priority / Satisfaction Rating
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition-transform duration-100 cursor-pointer"
                  >
                    <Star
                      size={24}
                      className={
                        s <= rating
                          ? "fill-[#c47d00] text-[#c47d00]"
                          : "text-[#e0e4ed] hover:text-[#c47d00]"
                      }
                    />
                  </button>
                ))}
                <span className="text-[12px] text-[#5a6478] ml-2 font-medium">
                  {rating === 1 && "Critical / Dissatisfied"}
                  {rating === 2 && "High / Mostly Dissatisfied"}
                  {rating === 3 && "Medium / Neutral"}
                  {rating === 4 && "Normal / Satisfied"}
                  {rating === 5 && "Low Priority / Very Satisfied"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-[#5a6478] block mb-1">Crime Description *</label>
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
            <label className="text-[12px] text-[#5a6478] block mb-1">
              Officer Notes / Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-[13px] border border-[#e0e4ed] rounded-md focus:outline-none focus:border-[#0a1f44] leading-relaxed"
              placeholder="Add any initial investigation feedback or citizen remarks..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#e0e4ed]">
            <button
              type="button"
              onClick={onClose}
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
              {isSubmitting ? "Saving..." : inquiryToEdit ? "Update Case" : "Register Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
