/*
  DESIGN: Dark Forge — Customer CRM
  Unified view of all customers aggregated from bookings, calendar,
  testimonials, and AI agent leads. Supports notes, tags, and status tracking.
*/
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  Users,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Bot,
  Star,
  Clock,
  DollarSign,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import ClientDetailModal from "@/components/ClientDetailModal";

export interface UnifiedClient {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  status: string;
  tags: string[];
  notes: string | null;
  sources: string[];
  inquiryCount: number;
  bookingCount: number;
  testimonialCount: number;
  agentLeadCount: number;
  lastActivity: number;
  firstSeen: number;
  totalSpend: number;
  latestBookingStatus: string | null;
  latestBookingDate: string | null;
  rating: number | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  lead: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/20" },
  booked: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  returning: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
};

const STATUS_LABELS = ["all", "lead", "booked", "completed", "returning"] as const;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function SourceIcon({ source }: { source: string }) {
  const cls = "w-3.5 h-3.5";
  switch (source) {
    case "booking": return <span title="Booking inquiry"><Inbox className={cls} /></span>;
    case "calendar": return <span title="Calendar booking"><Calendar className={cls} /></span>;
    case "testimonial": return <span title="Testimonial"><MessageSquare className={cls} /></span>;
    case "agent": return <span title="AI agent lead"><Bot className={cls} /></span>;
    default: return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.lead;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
      {status}
    </span>
  );
}

function ClientCard({ client, onClick }: { client: UnifiedClient; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 hover:border-gold-dim transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: name + contact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground truncate">{client.displayName}</span>
            <StatusBadge status={client.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {client.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />
                {client.phone}
              </span>
            )}
          </div>
        </div>

        {/* Right: activity date */}
        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
          {formatDate(client.lastActivity)}
        </span>
      </div>

      {/* Bottom row: tags, sources, stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Tags */}
          {client.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.20_0.005_250)] text-muted-foreground border border-border/50">
              {tag}
            </span>
          ))}
          {/* Source icons */}
          <div className="flex items-center gap-1.5 text-muted-foreground/50 ml-1">
            {client.sources.map((s) => <SourceIcon key={s} source={s} />)}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {client.bookingCount > 0 && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {client.bookingCount}
            </span>
          )}
          {client.totalSpend > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formatCurrency(client.totalSpend)}
            </span>
          )}
          {client.rating !== null && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" />
              {client.rating}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Clients() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();
  const [clients, setClients] = useState<UnifiedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<UnifiedClient | null>(null);

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
      const res = await authFetch("/api/dashboard/clients");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = clients;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return list;
  }, [clients, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = { lead: 0, booked: 0, completed: 0, returning: 0 };
    for (const c of clients) counts[c.status] = (counts[c.status] || 0) + 1;
    return counts;
  }, [clients]);

  const handleClientUpdated = useCallback((updated: UnifiedClient) => {
    setClients((prev) =>
      prev.map((c) => {
        // Match by email or phone or id
        if (
          (c.email && updated.email && c.email === updated.email) ||
          (c.phone && updated.phone && c.phone === updated.phone) ||
          c.id === updated.id
        ) {
          return { ...c, status: updated.status, tags: updated.tags, notes: updated.notes };
        }
        return c;
      })
    );
    setSelectedClient(updated);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Clients</h2>
            <p className="text-xs text-muted-foreground">
              {clients.length === 0
                ? "No clients yet"
                : `${clients.length} total \u00b7 ${stats.lead || 0} leads \u00b7 ${stats.booked || 0} booked`}
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

      {/* Search + Status filters */}
      {clients.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[oklch(0.16_0.005_250)] border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {STATUS_LABELS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-gold/10 text-gold border-gold/20"
                    : "text-muted-foreground border-border hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
                }`}
              >
                {s === "all" ? `All (${clients.length})` : `${s} (${stats[s] || 0})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <EmptyStateGuide
          icon={Users}
          title="No clients yet"
          description="Clients appear here automatically when people interact with your site."
          steps={[
            { label: "Booking inquiries", detail: "When someone submits a booking form on your site" },
            { label: "Calendar bookings", detail: "When you schedule appointments for clients" },
            { label: "Testimonials", detail: "When clients leave reviews on your site" },
            { label: "AI agent calls", detail: "When your AI assistant handles a call or chat" },
          ]}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Search className="w-6 h-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No clients match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => setSelectedClient(client)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        authFetch={authFetch}
        onClientUpdated={handleClientUpdated}
      />
    </div>
  );
}
