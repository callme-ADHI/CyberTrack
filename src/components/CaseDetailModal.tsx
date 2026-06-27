import { X, Printer, Star, Edit } from "lucide-react";
import type { Inquiry } from "@/lib/supabase";
import { format } from "date-fns";

export function CaseDetailModal({
  inquiry,
  onClose,
  onEdit,
}: {
  inquiry: Inquiry | null;
  onClose: () => void;
  onEdit?: () => void;
}) {
  if (!inquiry) return null;

  const print = () => window.print();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-[#e0e4ed] sticky top-0 bg-white">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#5a6478]">Case ID</p>
            <h2 className="text-xl font-semibold text-[#0a1f44]">#{inquiry.id}</h2>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn-primary flex items-center gap-1.5 cursor-pointer"
              >
                <Edit size={14} /> Edit
              </button>
            )}
            <button onClick={print} className="btn-ghost flex items-center gap-1.5 cursor-pointer">
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-[#f4f6f9] text-[#5a6478] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" value={inquiry.categories?.name || "—"} />
            <Field
              label="Location"
              value={
                inquiry.locations ? `${inquiry.locations.name}, ${inquiry.locations.taluk}` : "—"
              }
            />
            <Field label="Complainant Name" value={inquiry.complainant_name} />
            <Field label="Phone" value={inquiry.complainant_phone || "—"} />
            <Field
              label="Submitted At"
              value={format(new Date(inquiry.created_at), "dd MMM yyyy, HH:mm")}
            />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#5a6478] mb-1">Rating</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    className={
                      s <= (inquiry.rating || 0)
                        ? "fill-[#c47d00] text-[#c47d00]"
                        : "text-[#e0e4ed]"
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#5a6478] mb-1.5">
              Description
            </p>
            <p className="text-[14px] text-[#0d1b2a] bg-[#f4f6f9] p-3 rounded-md leading-relaxed">
              {inquiry.description || "No description provided."}
            </p>
          </div>

          {inquiry.feedback && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#5a6478] mb-1.5">Feedback</p>
              <p className="text-[14px] text-[#0d1b2a] bg-[#f4f6f9] p-3 rounded-md leading-relaxed italic">
                "{inquiry.feedback}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[#5a6478] mb-1">{label}</p>
      <p className="text-[14px] text-[#0d1b2a] font-medium">{value}</p>
    </div>
  );
}

export function maskPhone(p: string) {
  if (!p) return "—";
  const clean = p.replace(/\D/g, "");
  if (clean.length < 4) return p;
  return clean.slice(0, 3) + "****" + clean.slice(-2);
}

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= (rating || 0) ? "fill-[#c47d00] text-[#c47d00]" : "text-[#e0e4ed]"}
        />
      ))}
    </div>
  );
}
