/*
  DESIGN: Dark Forge — Bookings Management
  Three tabs: Calendar (default), Inquiries, Settings.
  Calendar: monthly grid with booking chips, side panel, edit modal.
  Inquiries: existing inbox with "Assign to Calendar" action.
  Settings: deposit amount, working hours, deposit required toggle.
*/
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  CalendarDays, Check, Archive, Trash2, Mail, Phone,
  RefreshCw, Eye, ExternalLink, Settings2, CalendarPlus,
  Plus, Loader2, Save,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import FormBuilder from "@/components/FormBuilder";
import BookingCalendar from "@/components/BookingCalendar";
import BookingDetailModal, { type CalendarBooking } from "@/components/BookingDetailModal";
import AssignToCalendarModal from "@/components/AssignToCalendarModal";

// ── Types ────────────────────────────────────────────────────────────

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: number;
}

interface BookingSettings {
  depositAmount: number;
  depositRequired: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string;
}

const DEFAULT_SETTINGS: BookingSettings = {
  depositAmount: 5000,
  depositRequired: false,
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  workingDays: "1,2,3,4,5",
};

const DAY_LABELS = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

// ── Inquiry Card ─────────────────────────────────────────────────────

function InquiryCard({
  b, onMarkRead, onArchive, onDelete, onAssign, actionLoading,
}: {
  b: Inquiry;
  onMarkRead?: () => void;
  onArchive?: () => void;
  onDelete: () => void;
  onAssign: () => void;
  actionLoading: boolean;
}) {
  const date = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = new Date(b.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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
              <Mail className="w-3 h-3" />{b.email}
            </a>
            {b.phone && (
              <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-gold transition-colors">
                <Phone className="w-3 h-3" />{b.phone}
              </a>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5 text-right">
          {date}<br />{time}
        </span>
      </div>
      {b.service && (
        <div className="text-xs"><span className="text-muted-foreground">Service: </span><span className="text-foreground">{b.service}</span></div>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{b.message}</p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onAssign}
          disabled={actionLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-xs font-medium disabled:opacity-50"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Assign to Calendar
        </button>
        {onMarkRead && (
          <button onClick={onMarkRead} disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-xs font-medium disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" />Mark Read
          </button>
        )}
        {onArchive && (
          <button onClick={onArchive} disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-xs font-medium disabled:opacity-50">
            <Archive className="w-3.5 h-3.5" />Archive
          </button>
        )}
        <button onClick={onDelete} disabled={actionLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-medium disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function Bookings() {
  const { getToken, convexHttpUrl } = useAuth();
  const { currentSite } = useSite();

  // Tab state
  const [tab, setTab] = useState<"calendar" | "inquiries" | "settings">("calendar");

  // Calendar state
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calLoading, setCalLoading] = useState(true);
  const [editBooking, setEditBooking] = useState<CalendarBooking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();

  // Inquiry state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inqLoading, setInqLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assignInquiry, setAssignInquiry] = useState<Inquiry | null>(null);

  // Settings state
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Stripe Connect state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboarded, setStripeOnboarded] = useState(false);

  // ── Auth fetch helpers ─────────────────────────────────────────────

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [getToken, convexHttpUrl]
  );

  // ── Calendar data ──────────────────────────────────────────────────

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const month = format(currentMonth, "yyyy-MM");
      const res = await authFetch(`/api/dashboard/calendar/list?month=${month}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCalendarBookings(data.bookings || []);
    } catch {
      toast.error("Failed to load calendar bookings");
    } finally {
      setCalLoading(false);
    }
  }, [authFetch, currentMonth]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Load Stripe Connect status once
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/dashboard/calendar/stripe-status");
        if (res.ok) {
          const data = await res.json();
          setStripeConnected(data.connected);
          setStripeOnboarded(data.onboardingComplete);
        }
      } catch { /* non-critical */ }
    })();
  }, [authFetch]);

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  const handleSaveBooking = async (data: Partial<CalendarBooking>) => {
    if (data._id) {
      // Update
      const res = await authFetch("/api/dashboard/calendar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data._id, ...data }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Booking updated");
    } else {
      // Create
      const res = await authFetch("/api/dashboard/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Booking created");
    }
    loadCalendar();
  };

  const handleDeleteBooking = async (id: string) => {
    const res = await authFetch("/api/dashboard/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(await res.text());
    toast.success("Booking deleted");
    loadCalendar();
  };

  const handleRequestDeposit = async (id: string, amount: number) => {
    const booking = calendarBookings.find((b) => b._id === id);
    const res = await authFetch("/api/dashboard/calendar/request-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, amount, description: booking?.service || "Booking deposit" }),
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    loadCalendar();
    return result;
  };

  const handleMarkDeposit = async (id: string) => {
    const res = await authFetch("/api/dashboard/calendar/mark-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(await res.text());
    loadCalendar();
  };

  // ── Inquiry data ───────────────────────────────────────────────────

  const loadInquiries = useCallback(async () => {
    setInqLoading(true);
    try {
      const res = await authFetch("/api/dashboard/bookings");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInquiries(data.bookings || []);
    } catch {
      toast.error("Failed to load inquiries");
    } finally {
      setInqLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { if (tab === "inquiries") loadInquiries(); }, [tab, loadInquiries]);

  const handleInquiryAction = async (id: string, action: "read" | "archive" | "delete") => {
    setActionLoading(id);
    try {
      const res = await authFetch(`/api/dashboard/bookings/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (action === "delete") {
        toast.success("Inquiry deleted");
        setInquiries((prev) => prev.filter((b) => b._id !== id));
      } else if (action === "read") {
        toast.success("Marked as read");
        setInquiries((prev) => prev.map((b) => (b._id === id ? { ...b, status: "read" as const } : b)));
      } else {
        toast.success("Inquiry archived");
        setInquiries((prev) => prev.map((b) => (b._id === id ? { ...b, status: "archived" as const } : b)));
      }
    } catch {
      toast.error(`Failed to ${action} inquiry`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignToCalendar = async (data: {
    inquiryId: string; clientName: string; clientEmail: string;
    clientPhone?: string; service?: string; message: string;
    date: string; startTime?: string; endTime?: string;
  }) => {
    // Create calendar booking
    const res = await authFetch("/api/dashboard/calendar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());

    // Archive the inquiry
    await authFetch("/api/dashboard/bookings/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.inquiryId }),
    });

    toast.success("Assigned to calendar");
    setInquiries((prev) => prev.map((b) => (b._id === data.inquiryId ? { ...b, status: "archived" as const } : b)));
    loadCalendar();
  };

  const newInquiries = useMemo(() => inquiries.filter((b) => b.status === "new"), [inquiries]);
  const readInquiries = useMemo(() => inquiries.filter((b) => b.status === "read"), [inquiries]);
  const archivedInquiries = useMemo(() => inquiries.filter((b) => b.status === "archived"), [inquiries]);

  // ── Settings data ──────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await authFetch("/api/dashboard/calendar/settings");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSettings(data.settings || DEFAULT_SETTINGS);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { if (tab === "settings") loadSettings(); }, [tab, loadSettings]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await authFetch("/api/dashboard/calendar/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleWorkingDay = (day: string) => {
    const days = settings.workingDays.split(",").filter(Boolean);
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    days.sort();
    setSettings((s) => ({ ...s, workingDays: days.join(",") }));
  };

  const workingDaysArr = settings.workingDays.split(",").filter(Boolean);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <CalendarDays className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Bookings</h2>
            <p className="text-xs text-muted-foreground">
              {calendarBookings.length} scheduled · {newInquiries.length} new inquiries
            </p>
          </div>
        </div>
        {tab === "calendar" && (
          <button
            onClick={() => { setCreateDate(undefined); setShowCreateModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Booking
          </button>
        )}
        {tab === "inquiries" && (
          <button onClick={loadInquiries} disabled={inqLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${inqLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[oklch(0.15_0.005_250)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("calendar")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "calendar" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Calendar
        </button>
        <button
          onClick={() => setTab("inquiries")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "inquiries" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Inquiries
          {newInquiries.length > 0 && (
            <span className="text-[10px] font-semibold text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">
              {newInquiries.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "settings" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      {/* ── Calendar Tab ─────────────────────────────────────────────── */}
      {tab === "calendar" && (
        <div className="bg-card border border-border rounded-lg p-5">
          {calLoading && calendarBookings.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading calendar...
            </div>
          ) : (
            <BookingCalendar
              bookings={calendarBookings}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onClickBooking={(b) => setEditBooking(b)}
              onClickAdd={(date) => { setCreateDate(date); setShowCreateModal(true); }}
            />
          )}
        </div>
      )}

      {/* ── Inquiries Tab ────────────────────────────────────────────── */}
      {tab === "inquiries" && inqLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading inquiries...
        </div>
      ) : tab === "inquiries" && inquiries.length === 0 ? (
        <EmptyStateGuide
          icon={CalendarDays}
          title="No booking inquiries yet"
          description="Once clients start submitting through your booking page, their inquiries will appear here."
          steps={[
            { label: "Your booking page is live", detail: currentSite?.domain ? `${currentSite.domain}/booking` : "Accessible from your site" },
            { label: "Share the link with potential clients", detail: "Post it on social media or send directly" },
            { label: "Assign inquiries to your calendar", detail: "Use the calendar to schedule and manage bookings" },
          ]}
          action={
            currentSite?.domain ? (
              <a href={`https://${currentSite.domain}/booking`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />View Booking Page
              </a>
            ) : undefined
          }
        />
      ) : tab === "inquiries" ? (
        <div className="space-y-8">
          {/* New */}
          {newInquiries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-semibold text-foreground">
                  New Inquiries
                  <span className="ml-2 text-xs font-normal text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">{newInquiries.length}</span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {newInquiries.map((b) => (
                  <InquiryCard key={b._id} b={b}
                    onMarkRead={() => handleInquiryAction(b._id, "read")}
                    onArchive={() => handleInquiryAction(b._id, "archive")}
                    onDelete={() => handleInquiryAction(b._id, "delete")}
                    onAssign={() => setAssignInquiry(b)}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}
          {/* Read */}
          {readInquiries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">
                  Read <span className="ml-2 text-xs font-normal text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">{readInquiries.length}</span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {readInquiries.map((b) => (
                  <InquiryCard key={b._id} b={b}
                    onArchive={() => handleInquiryAction(b._id, "archive")}
                    onDelete={() => handleInquiryAction(b._id, "delete")}
                    onAssign={() => setAssignInquiry(b)}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}
          {/* Archived */}
          {archivedInquiries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Archived <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded-full">{archivedInquiries.length}</span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedInquiries.map((b) => (
                  <InquiryCard key={b._id} b={b}
                    onDelete={() => handleInquiryAction(b._id, "delete")}
                    onAssign={() => setAssignInquiry(b)}
                    actionLoading={actionLoading === b._id}
                  />
                ))}
              </div>
            </section>
          )}
          {newInquiries.length === 0 && readInquiries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">New Inquiries</h3>
              </div>
              <p className="text-xs text-muted-foreground/60 pl-6">No new booking inquiries.</p>
            </section>
          )}
        </div>
      ) : null}

      {/* ── Settings Tab ─────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading settings...
            </div>
          ) : (
            <>
              {/* Deposit */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Deposit</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Default Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        className="w-full bg-input border border-border rounded-md pl-7 pr-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                        value={(settings.depositAmount / 100).toFixed(2)}
                        onChange={(e) => setSettings((s) => ({ ...s, depositAmount: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Require Deposit</label>
                    <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                      <button
                        onClick={() => setSettings((s) => ({ ...s, depositRequired: !s.depositRequired }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${settings.depositRequired ? "bg-gold" : "bg-border"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.depositRequired ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                      <span className="text-sm text-muted-foreground">{settings.depositRequired ? "Required" : "Optional"}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground">Working Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Start</label>
                    <input
                      type="time"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                      value={settings.workingHoursStart}
                      onChange={(e) => setSettings((s) => ({ ...s, workingHoursStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">End</label>
                    <input
                      type="time"
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                      value={settings.workingHoursEnd}
                      onChange={(e) => setSettings((s) => ({ ...s, workingHoursEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Working Days */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground">Working Days</h3>
                <div className="flex gap-2">
                  {DAY_LABELS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => toggleWorkingDay(d.value)}
                      className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        workingDaysArr.includes(d.value)
                          ? "bg-gold/10 text-gold border-gold/20"
                          : "bg-[oklch(0.16_0.005_250)] text-muted-foreground border-border hover:border-gold/20"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Builder */}
              <div className="border-t border-border pt-6">
                <FormBuilder />
              </div>

              {/* Save */}
              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}

      <BookingDetailModal
        open={!!editBooking}
        onClose={() => setEditBooking(null)}
        booking={editBooking}
        onSave={handleSaveBooking}
        onDelete={handleDeleteBooking}
        onRequestDeposit={stripeOnboarded ? handleRequestDeposit : undefined}
        onMarkDeposit={handleMarkDeposit}
        stripeConnected={stripeConnected}
        stripeOnboarded={stripeOnboarded}
        defaultDepositAmount={settings.depositAmount}
      />

      <BookingDetailModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        booking={null}
        isCreate
        initialDate={createDate}
        onSave={handleSaveBooking}
        defaultDepositAmount={settings.depositAmount}
      />

      <AssignToCalendarModal
        open={!!assignInquiry}
        onClose={() => setAssignInquiry(null)}
        inquiry={assignInquiry}
        onAssign={handleAssignToCalendar}
      />
    </div>
  );
}
