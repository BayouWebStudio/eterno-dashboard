/*
  DESIGN: Dark Forge — Testimonials Management
  Clients review, approve, or delete testimonials submitted through their site.
  Only visible in the sidebar when the site has a testimonials.html page.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { Star, Check, Trash2, MessageSquare, Clock, RefreshCw, Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import EmptyStateGuide from "@/components/EmptyStateGuide";

interface Testimonial {
  _id: string;
  name: string;
  rating: number;
  reviewText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  photoBase64?: string;
  featured?: boolean;
  featuredOrder?: number;
}

const MAX_FEATURED = 4;

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
  onToggleFeatured,
  actionLoading,
  featuredCount,
}: {
  t: Testimonial;
  onApprove?: () => void;
  onDelete: () => void;
  onToggleFeatured?: () => void;
  actionLoading: boolean;
  featuredCount?: number;
}) {
  const date = new Date(t.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const canFeature = t.featured || (featuredCount ?? 0) < MAX_FEATURED;

  return (
    <div className={`bg-[oklch(0.16_0.005_250)] border rounded-lg p-4 flex flex-col gap-3 transition-colors ${t.featured ? "border-gold/40" : "border-border"}`}>
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {t.featured && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              Featured
            </span>
          )}
          <span className="text-xs text-muted-foreground mt-0.5">{date}</span>
        </div>
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
        {onToggleFeatured && (
          <button
            onClick={onToggleFeatured}
            disabled={actionLoading || (!t.featured && !canFeature)}
            title={t.featured ? "Remove from home page" : (canFeature ? "Feature on home page" : `Max ${MAX_FEATURED} featured`)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
              t.featured
                ? "bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20"
                : "bg-[oklch(0.20_0.005_250)] text-muted-foreground border border-border hover:text-foreground hover:border-gold/30"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${t.featured ? "fill-gold" : ""}`} />
            {t.featured ? "Featured" : "Feature"}
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
  const { currentSite } = useSite();
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

  const handleToggleFeatured = async (id: string, currentlyFeatured: boolean) => {
    setActionLoading(id);
    try {
      const res = await authFetch("/api/dashboard/testimonials/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, featured: !currentlyFeatured }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update featured status");
        return;
      }
      toast.success(currentlyFeatured ? "Removed from home page" : "Featured on home page");
      setTestimonials((prev) =>
        prev.map((t) =>
          t._id === id
            ? { ...t, featured: data.featured, featuredOrder: data.featuredOrder }
            : t
        )
      );
    } catch {
      toast.error("Failed to update featured status");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = testimonials.filter((t) => t.status === "pending");
  const approved = testimonials.filter((t) => t.status === "approved");
  const featuredCount = approved.filter((t) => t.featured).length;

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
        <EmptyStateGuide
          icon={MessageSquare}
          title="No testimonials submitted yet"
          description="Your clients can leave reviews directly on your site. Once submitted, they appear here for you to approve before going live."
          steps={[
            { label: "Share your review page with happy clients", detail: currentSite?.domain ? `${currentSite.domain}/testimonials` : "Link is on your site" },
            { label: "Review submissions as they come in", detail: "Approve the ones you want displayed on your site" },
            { label: "Approved reviews show up on your site automatically" },
          ]}
        />
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Approved
                    <span className="ml-2 text-xs font-normal text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                      {approved.length}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs text-muted-foreground">
                    Featured on home page: <span className="text-gold font-semibold">{featuredCount}/{MAX_FEATURED}</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 pl-6 -mt-1">
                Click "Feature" to show a testimonial on your site's home page. Up to {MAX_FEATURED} can be featured.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {approved.map((t) => (
                  <TestimonialCard
                    key={t._id}
                    t={t}
                    onDelete={() => handleDelete(t._id)}
                    onToggleFeatured={() => handleToggleFeatured(t._id, !!t.featured)}
                    actionLoading={actionLoading === t._id}
                    featuredCount={featuredCount}
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
