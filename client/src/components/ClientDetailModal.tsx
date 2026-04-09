/*
  DESIGN: Dark Forge — Client Detail Sheet
  Slide-over panel showing full client profile, notes, tags,
  and activity timeline from all sources.
*/
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Mail,
  Phone,
  Copy,
  Calendar,
  Inbox,
  MessageSquare,
  Bot,
  Star,
  X,
  Plus,
  Clock,
  DollarSign,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { UnifiedClient } from "@/pages/Clients";

interface ClientDetailModalProps {
  client: UnifiedClient | null;
  onClose: () => void;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
  onClientUpdated: (client: UnifiedClient) => void;
}

interface DetailData {
  crmRecord: any;
  inquiries: any[];
  calendarBookings: any[];
  testimonials: any[];
  agentLeads: any[];
}

const STATUS_OPTIONS = ["lead", "booked", "completed", "returning"] as const;

const PRESET_TAGS = ["VIP", "Returning", "Deposit Pending", "Walk-in", "Referred", "New Client"];

const STATUS_COLORS: Record<string, string> = {
  lead: "text-gold",
  booked: "text-blue-400",
  completed: "text-emerald-400",
  returning: "text-purple-400",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

type TimelineItem = {
  type: "inquiry" | "booking" | "testimonial" | "agent";
  date: number;
  data: any;
};

function TimelineCard({ item }: { item: TimelineItem }) {
  const iconCls = "w-4 h-4 flex-shrink-0";

  if (item.type === "inquiry") {
    const d = item.data;
    return (
      <div className="bg-[oklch(0.14_0.005_250)] border border-border/50 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className={iconCls} />
          <span className="font-medium text-foreground">Booking Inquiry</span>
          <span className="ml-auto">{formatDate(d.createdAt)}</span>
        </div>
        {d.service && <p className="text-xs text-muted-foreground">Service: {d.service}</p>}
        <p className="text-sm text-foreground/80 line-clamp-3">{d.message}</p>
        <span className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
          d.status === "booked" ? "bg-emerald-500/10 text-emerald-400" :
          d.status === "new" ? "bg-gold/10 text-gold" :
          "bg-[oklch(0.20_0.005_250)] text-muted-foreground"
        }`}>
          {d.status}
        </span>
      </div>
    );
  }

  if (item.type === "booking") {
    const d = item.data;
    return (
      <div className="bg-[oklch(0.14_0.005_250)] border border-border/50 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className={iconCls} />
          <span className="font-medium text-foreground">Appointment</span>
          <span className="ml-auto">{d.date}{d.startTime ? ` at ${d.startTime}` : ""}</span>
        </div>
        {d.service && <p className="text-xs text-muted-foreground">Service: {d.service}</p>}
        {d.depositAmount && d.depositAmount > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Deposit: ${(d.depositAmount / 100).toFixed(0)}
          </p>
        )}
        {d.artistNotes && <p className="text-xs text-muted-foreground italic">Note: {d.artistNotes}</p>}
        <span className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
          d.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
          d.status === "confirmed" ? "bg-blue-500/10 text-blue-400" :
          d.status === "cancelled" ? "bg-red-500/10 text-red-400" :
          "bg-gold/10 text-gold"
        }`}>
          {d.status}
        </span>
      </div>
    );
  }

  if (item.type === "testimonial") {
    const d = item.data;
    return (
      <div className="bg-[oklch(0.14_0.005_250)] border border-border/50 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className={`${iconCls} fill-gold text-gold`} />
          <span className="font-medium text-foreground">Review</span>
          <span className="flex items-center gap-0.5 ml-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= d.rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
            ))}
          </span>
          <span className="ml-auto">{formatDate(d.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/80 line-clamp-3">"{d.reviewText}"</p>
      </div>
    );
  }

  if (item.type === "agent") {
    const d = item.data;
    return (
      <div className="bg-[oklch(0.14_0.005_250)] border border-border/50 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className={iconCls} />
          <span className="font-medium text-foreground">AI {d.channel}</span>
          <span className="ml-auto">{formatDate(d.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/80 line-clamp-3">{d.summary}</p>
      </div>
    );
  }

  return null;
}

export default function ClientDetailModal({ client, onClose, authFetch, onClientUpdated }: ClientDetailModalProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "inquiries" | "bookings" | "reviews" | "leads">("all");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("lead");
  const [tags, setTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load detail when client changes
  useEffect(() => {
    if (!client) { setDetail(null); return; }
    setStatus(client.status);
    setTags(client.tags || []);
    setNotes(client.notes || "");
    setActiveTab("all");

    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const params = new URLSearchParams();
        if (client.email) params.set("email", client.email);
        else if (client.phone) params.set("phone", client.phone);
        const res = await authFetch(`/api/dashboard/clients/detail?${params}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setDetail(data);
        // Populate from CRM record if exists
        if (data.crmRecord) {
          setNotes(data.crmRecord.notes || "");
          setStatus(data.crmRecord.status || client.status);
          setTags(data.crmRecord.tags || client.tags || []);
        }
      } catch {
        toast.error("Failed to load client details");
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [client, authFetch]);

  // Save CRM metadata (debounced for notes)
  const saveMetadata = useCallback(async (overrides?: { status?: string; tags?: string[]; notes?: string }) => {
    if (!client) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        displayName: client.displayName,
        status: overrides?.status ?? status,
        tags: overrides?.tags ?? tags,
        notes: overrides?.notes ?? notes,
      };
      if (client.email) body.email = client.email;
      if (client.phone) body.phone = client.phone;

      const res = await authFetch("/api/dashboard/clients/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      onClientUpdated({
        ...client,
        status: body.status,
        tags: body.tags,
        notes: body.notes,
      });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [client, status, tags, notes, authFetch, onClientUpdated]);

  // Debounced notes save
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMetadata({ notes: value });
    }, 1000);
  }, [saveMetadata]);

  // Status change
  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
    saveMetadata({ status: newStatus });
  }, [saveMetadata]);

  // Tag management
  const addTag = useCallback((tag: string) => {
    if (tags.includes(tag)) return;
    const newTags = [...tags, tag];
    setTags(newTags);
    setShowTagPicker(false);
    saveMetadata({ tags: newTags });
  }, [tags, saveMetadata]);

  const removeTag = useCallback((tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    saveMetadata({ tags: newTags });
  }, [tags, saveMetadata]);

  // Build timeline
  const timeline = useMemo((): TimelineItem[] => {
    if (!detail) return [];
    const items: TimelineItem[] = [];
    for (const d of detail.inquiries) items.push({ type: "inquiry", date: d.createdAt, data: d });
    for (const d of detail.calendarBookings) items.push({ type: "booking", date: d.createdAt, data: d });
    for (const d of detail.testimonials) items.push({ type: "testimonial", date: d.createdAt, data: d });
    for (const d of detail.agentLeads) items.push({ type: "agent", date: d.createdAt, data: d });
    items.sort((a, b) => b.date - a.date);
    return items;
  }, [detail]);

  const filteredTimeline = useMemo((): TimelineItem[] => {
    if (activeTab === "all") return timeline;
    const typeMap: Record<string, string> = {
      inquiries: "inquiry",
      bookings: "booking",
      reviews: "testimonial",
      leads: "agent",
    };
    return timeline.filter((item: TimelineItem) => item.type === typeMap[activeTab]);
  }, [timeline, activeTab]);

  const tabCounts = useMemo(() => ({
    all: timeline.length,
    inquiries: detail?.inquiries.length || 0,
    bookings: detail?.calendarBookings.length || 0,
    reviews: detail?.testimonials.length || 0,
    leads: detail?.agentLeads.length || 0,
  }), [timeline, detail]);

  // Cleanup save timer
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  return (
    <Sheet open={!!client} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] bg-background border-l border-border p-0 overflow-y-auto"
      >
        <SheetTitle className="sr-only">Client Details</SheetTitle>

        {client && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-border space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground">{client.displayName}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                    {client.email && (
                      <button
                        onClick={() => copyToClipboard(client.email!)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {client.email}
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    {client.phone && (
                      <button
                        onClick={() => copyToClipboard(client.phone!)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {client.phone}
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Since {formatDate(client.firstSeen)}
                </div>
              </div>

              {/* Status + Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`appearance-none text-xs font-semibold uppercase tracking-wider px-3 py-1.5 pr-7 rounded-md border border-border bg-[oklch(0.14_0.005_250)] cursor-pointer focus:outline-none focus:border-gold/40 ${STATUS_COLORS[status] || "text-foreground"}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="px-5 py-3 border-b border-border">
              <div className="flex items-center flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gold/10 text-gold border border-gold/20"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-foreground transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setShowTagPicker(!showTagPicker)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-gold/40 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Tag
                  </button>
                  {showTagPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-[oklch(0.16_0.005_250)] border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                      {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-[oklch(0.19_0.005_250)] transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="px-5 py-3 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Notes {saving && <span className="text-gold/50 ml-1">saving...</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add private notes about this client..."
                rows={3}
                className="w-full text-sm bg-[oklch(0.14_0.005_250)] border border-border rounded-md p-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 transition-colors resize-none"
              />
            </div>

            {/* Activity Timeline */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Tabs */}
              <div className="px-5 pt-3 pb-2 flex gap-1 overflow-x-auto">
                {(["all", "inquiries", "bookings", "reviews", "leads"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1.5 text-xs rounded-md border whitespace-nowrap transition-colors capitalize ${
                      activeTab === tab
                        ? "bg-gold/10 text-gold border-gold/20"
                        : "text-muted-foreground border-border hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
                    }`}
                  >
                    {tab} ({tabCounts[tab]})
                  </button>
                ))}
              </div>

              {/* Timeline content */}
              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    Loading activity...
                  </div>
                ) : filteredTimeline.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    No activity in this category
                  </div>
                ) : (
                  filteredTimeline.map((item: TimelineItem, i: number) => <TimelineCard key={`${item.type}-${i}`} item={item} />)
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
