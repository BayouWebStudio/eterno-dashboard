/*
  DESIGN: Dark Forge — Testimonials Management
  Clients review, approve, or delete testimonials submitted through their site.
  Only visible in the sidebar when the site has a testimonials.html page.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Check, Trash2, MessageSquare, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  _id: string;
  name: string;
  rating: number;
  reviewText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  photoBase64?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  t,
  onApprove,
  onDelete,
  actionLoading,
}: {
  t: Testimonial;
  onApprove?: () => void;
  onDelete: () => void;
  actionLoading: boolean;
}) {
  const date = new Date(t.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {t.photoBase64 && (
            <img
              src={t.photoBase64}
              alt={t.name}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-border"
            />
          )}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">{t.name}</span>
            <StarRating rating={t.rating} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{date}</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
        "{t.reviewText}"
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-xs font-medium disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={actionLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-medium disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { getToken, convexHttpUrl } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/dashboard/testimonials");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTestimonials(data.testimonials || []);
    } catch (err) {
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await authFetch("/api/dashboard/testimonials/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Testimonial approved");
      setTestimonials((prev) =>
        prev.map((t) => (t._id === id ? { ...t, status: "approved" } : t))
      );
    } catch {
      toast.error("Failed to approve testimonial");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await authFetch("/api/dashboard/testimonials/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Testimonial deleted");
      setTestimonials((prev) => prev.filter((t) => t._id !== id));
    } catch {
      toast.error("Failed to delete testimonial");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = testimonials.filter((t) => t.status === "pending");
  const approved = testimonials.filter((t) => t.status === "approved");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <MessageSquare className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Testimonials</h2>
            <p className="text-xs text-muted-foreground">
              {testimonials.length === 0 ? "No submissions yet" : `${testimonials.length} total · ${pending.length} pending`}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading testimonials...
        </div>
      ) : testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[oklch(0.18_0.005_250)] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No testimonials submitted yet</p>
          <p className="text-xs text-muted-foreground/60">When clients submit reviews on your site they'll appear here for approval.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Pending Review
                  <span className="ml-2 text-xs font-normal text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((t) => (
                  <TestimonialCard
                    key={t._id}
                    t={t}
                    onApprove={() => handleApprove(t._id)}
                    onDelete={() => handleDelete(t._id)}
                    actionLoading={actionLoading === t._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Approved
                  <span className="ml-2 text-xs font-normal text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                    {approved.length}
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {approved.map((t) => (
                  <TestimonialCard
                    key={t._id}
                    t={t}
                    onDelete={() => handleDelete(t._id)}
                    actionLoading={actionLoading === t._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* If only pending exist, show empty approved state */}
          {approved.length === 0 && pending.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">Approved</h3>
              </div>
              <p className="text-xs text-muted-foreground/60 pl-6">
                Approved testimonials will appear on your site. Approve submissions above to get started.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
