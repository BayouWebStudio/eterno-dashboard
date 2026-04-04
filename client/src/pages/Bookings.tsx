/*
  DESIGN: Dark Forge — Bookings Management
  Clients view, mark as read, and archive booking inquiries submitted through their site.
  Only visible in the sidebar when the site has a booking.html page.
*/
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { CalendarDays, Check, Archive, Trash2, Mail, Phone, RefreshCw, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import EmptyStateGuide from "@/components/EmptyStateGuide";

interface Booking {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: number;
}

function BookingCard({
  b,
  onMarkRead,
  onArchive,
  onDelete,
  actionLoading,
}: {
  b: Booking;
  onMarkRead?: () => void;
  onArchive?: () => void;
  onDelete: () => void;
  actionLoading: boolean;
}) {
  const date = new Date(b.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(b.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={`bg-[oklch(0.16_0.005_250)] border rounded-lg p-4 flex flex-col gap-3 ${b.status === "new" ? "border-gold/30" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{b.name}</span>
            {b.status === "new" && (
              <span className="text-[10px] font-medium text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">NEW</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <a href={`mailto:${b.email}`} className="flex items-center gap-1 hover:text-gold transition-colors">
              <Mail className="w-3 h-3" />
              {b.email}
            </a>
            {b.phone && (
              <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-gold transition-colors">
                <Phone className="w-3 h-3" />
                {b.phone}
              </a>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5 text-right">
          {date}<br />{time}
        </span>
      </div>

      {b.service && (
        <div className="text-xs">
          <span className="text-muted-foreground">Service: </span>
          <span className="text-foreground">{b.service}</span>
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
        {b.message}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onMarkRead && (
          <button
            onClick={onMarkRead}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-xs font-medium disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            Mark Read
          </button>
        )}
        {onArchive && (
          <button
            onClick={onArchive}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-xs font-medium disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            Archive
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

export default function Bookings() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
      const res = await authFetch("/api/dashboard/bookings");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: "read" | "archive" | "delete") => {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/dashboard/bookings/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());

      if (action === "delete") {
        toast.success("Booking deleted");
        setBookings((prev) => prev.filter((b) => b._id !== id));
      } else if (action === "read") {
        toast.success("Marked as read");
        setBookings((prev) =>
          prev.map((b) => (b._id === id ? { ...b, status: "read" as const } : b))
        );
      } else {
        toast.success("Booking archived");
        setBookings((prev) =>
          prev.map((b) => (b._id === id ? { ...b, status: "archived" as const } : b))
        );
      }
    } catch {
      toast.error(`Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  };

  const newBookings = bookings.filter((b) => b.status === "new");
  const readBookings = bookings.filter((b) => b.status === "read");
  const archivedBookings = bookings.filter((b) => b.status === "archived");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <CalendarDays className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Bookings</h2>
            <p className="text-xs text-muted-foreground">
              {bookings.length === 0 ? "No inquiries yet" : `${bookings.length} total · ${newBookings.length} new`}
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
          Loading bookings...
        </div>
      ) : bookings.length === 0 ? (
        <EmptyStateGuide
          icon={CalendarDays}
          title="No booking inquiries yet"
          description="Once clients start submitting through your booking page, their inquiries will appear here for you to manage."
          steps={[
            { label: "Your booking page is live", detail: currentSite?.domain ? `${currentSite.domain}/booking` : "Accessible from your site navigation" },
            { label: "Share the link with potential clients", detail: "Post it on your social media or send it directly" },
            { label: "New inquiries show up here automatically", detail: "You can mark them as read, archive, or delete" },
          ]}
          action={
            currentSite?.domain ? (
              <a
                href={`https://${currentSite.domain}/booking`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Booking Page
              </a>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {/* New */}
          {newBookings.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-semibold text-foreground">
                  New Inquiries
                  <span className="ml-2 text-xs font-normal text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">
                    {newBookings.length}
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {newBookings.map((b) => (
                  <BookingCard
                    key={b._id}
                    b={b}
                    onMarkRead={() => handleAction(b._id, "read")}
                    onArchive={() => handleAction(b._id, "archive")}
                    onDelete={() => handleAction(b._id, "delete")}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Read */}
          {readBookings.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Read
                  <span className="ml-2 text-xs font-normal text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">
                    {readBookings.length}
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {readBookings.map((b) => (
                  <BookingCard
                    key={b._id}
                    b={b}
                    onArchive={() => handleAction(b._id, "archive")}
                    onDelete={() => handleAction(b._id, "delete")}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Archived */}
          {archivedBookings.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Archived
                  <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded-full">
                    {archivedBookings.length}
                  </span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedBookings.map((b) => (
                  <BookingCard
                    key={b._id}
                    b={b}
                    onDelete={() => handleAction(b._id, "delete")}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty states */}
          {newBookings.length === 0 && readBookings.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">New Inquiries</h3>
              </div>
              <p className="text-xs text-muted-foreground/60 pl-6">No new booking inquiries.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
