/*
  DESIGN: Dark Forge — Booking Detail Modal
  View/edit a calendar booking. Status actions, Stripe deposit, contact info.
*/
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  X, Save, Loader2, Check, DollarSign, Ban, Trash2,
  ChevronDown, ChevronUp, Copy, ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export interface CalendarBooking {
  _id: string;
  siteSlug: string;
  inquiryId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  service?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: string;
  artistNotes?: string;
  message?: string;
  depositAmount?: number;
  stripeSessionId?: string;
  stripeCheckoutUrl?: string;
  createdAt: number;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "text-gold bg-gold/10 border-gold/20" },
  { value: "confirmed", label: "Confirmed", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { value: "deposit_requested", label: "Deposit Requested", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { value: "deposit_received", label: "Deposit Received", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { value: "completed", label: "Completed", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
  { value: "cancelled", label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

interface BookingDetailModalProps {
  open: boolean;
  onClose: () => void;
  booking: CalendarBooking | null;
  isCreate?: boolean;
  initialDate?: string;
  onSave: (data: Partial<CalendarBooking>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRequestDeposit?: (id: string, amount: number) => Promise<{ url?: string }>;
  onMarkDeposit?: (id: string) => Promise<void>;
  defaultDepositAmount?: number;
}

export default function BookingDetailModal({
  open, onClose, booking, isCreate, initialDate,
  onSave, onDelete, onRequestDeposit, onMarkDeposit,
  defaultDepositAmount = 5000,
}: BookingDetailModalProps) {
  const [form, setForm] = useState(() => initForm(booking, initialDate, defaultDepositAmount));
  const [saving, setSaving] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [depositUrl, setDepositUrl] = useState(booking?.stripeCheckoutUrl || "");
  const [actionLoading, setActionLoading] = useState("");

  function initForm(b: CalendarBooking | null, date?: string, deposit?: number) {
    if (b) return {
      clientName: b.clientName, clientEmail: b.clientEmail || "", clientPhone: b.clientPhone || "",
      service: b.service || "", date: b.date, startTime: b.startTime || "", endTime: b.endTime || "",
      status: b.status, artistNotes: b.artistNotes || "", message: b.message || "",
      depositAmount: b.depositAmount ?? deposit ?? 5000,
    };
    return {
      clientName: "", clientEmail: "", clientPhone: "", service: "",
      date: date || new Date().toISOString().split("T")[0],
      startTime: "", endTime: "", status: "pending", artistNotes: "", message: "",
      depositAmount: deposit ?? 5000,
    };
  }

  // Reset form when booking changes
  const bookingId = booking?._id || "";
  const [prevId, setPrevId] = useState(bookingId);
  if (bookingId !== prevId) {
    setPrevId(bookingId);
    setForm(initForm(booking, initialDate, defaultDepositAmount));
    setDepositUrl(booking?.stripeCheckoutUrl || "");
    setShowContact(false);
    setShowDatePicker(false);
    setActionLoading("");
  }

  const handleSave = async () => {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    if (!form.date) { toast.error("Date is required"); return; }
    setSaving(true);
    try {
      await onSave({
        _id: booking?._id,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim() || undefined,
        clientPhone: form.clientPhone.trim() || undefined,
        service: form.service.trim() || undefined,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        status: form.status,
        artistNotes: form.artistNotes.trim() || undefined,
        message: form.message.trim() || undefined,
        depositAmount: form.depositAmount,
      });
      onClose();
    } catch {
      toast.error("Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (newStatus: string) => {
    if (!booking) return;
    setActionLoading(newStatus);
    try {
      await onSave({ _id: booking._id, status: newStatus });
      setForm((f) => ({ ...f, status: newStatus }));
      toast.success(`Booking ${newStatus === "confirmed" ? "confirmed" : newStatus === "completed" ? "completed" : "cancelled"}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading("");
    }
  };

  const handleRequestDeposit = async () => {
    if (!booking || !onRequestDeposit) return;
    setActionLoading("deposit");
    try {
      const result = await onRequestDeposit(booking._id, form.depositAmount);
      if (result.url) {
        setDepositUrl(result.url);
        setForm((f) => ({ ...f, status: "deposit_requested" }));
        toast.success("Deposit link created");
      }
    } catch {
      toast.error("Failed to create deposit link");
    } finally {
      setActionLoading("");
    }
  };

  const handleMarkDeposit = async () => {
    if (!booking || !onMarkDeposit) return;
    setActionLoading("mark_deposit");
    try {
      await onMarkDeposit(booking._id);
      setForm((f) => ({ ...f, status: "deposit_received" }));
      toast.success("Deposit marked as received");
    } catch {
      toast.error("Failed to mark deposit");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!booking || !onDelete) return;
    setActionLoading("delete");
    try {
      await onDelete(booking._id);
      onClose();
    } catch {
      toast.error("Failed to delete booking");
    } finally {
      setActionLoading("");
    }
  };

  const statusStyle = getStatusStyle(form.status);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[oklch(0.14_0.005_250)] border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          {isCreate ? "New Booking" : `Booking — ${booking?.clientName}`}
        </DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-heading font-bold text-foreground">
              {isCreate ? "New Booking" : "Booking Details"}
            </h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Client Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Client Name</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              placeholder="Client name"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</label>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground text-left hover:border-gold/50 transition-colors"
            >
              {form.date ? new Date(form.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Select date"}
            </button>
            {showDatePicker && (
              <div className="border border-border rounded-lg bg-[oklch(0.16_0.005_250)] p-2">
                <Calendar
                  mode="single"
                  selected={form.date ? new Date(form.date + "T12:00:00") : undefined}
                  onSelect={(d) => {
                    if (d) {
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      setForm((f) => ({ ...f, date: iso }));
                    }
                    setShowDatePicker(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Start Time</label>
              <input
                type="time"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">End Time</label>
              <input
                type="time"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Service</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
              value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
              placeholder="e.g. Full sleeve, portrait, etc."
            />
          </div>

          {/* Status Dropdown (edit mode only) */}
          {!isCreate && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</label>
              <select
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Artist Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Artist Notes</label>
            <textarea
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y"
              value={form.artistNotes}
              onChange={(e) => setForm((f) => ({ ...f, artistNotes: e.target.value }))}
              placeholder="Private notes..."
              rows={3}
            />
          </div>

          {/* Deposit Amount */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Deposit Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                className="w-full bg-input border border-border rounded-md pl-7 pr-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={(form.depositAmount / 100).toFixed(2)}
                onChange={(e) => setForm((f) => ({ ...f, depositAmount: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Stripe Deposit URL (if exists) */}
          {depositUrl && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Deposit Payment Link</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={depositUrl}
                  className="flex-1 bg-input border border-border rounded-md px-2 py-1.5 text-xs text-muted-foreground truncate"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(depositUrl); toast.success("Link copied"); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-md"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={depositUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Client Contact (collapsible) */}
          {!isCreate && (booking?.clientEmail || booking?.clientPhone || booking?.message) && (
            <div className="border border-border rounded-lg">
              <button
                onClick={() => setShowContact(!showContact)}
                className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Client Info & Original Message
                {showContact ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showContact && (
                <div className="px-3 pb-3 space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                  {booking?.clientEmail && <div><span className="text-foreground">Email:</span> {booking.clientEmail}</div>}
                  {booking?.clientPhone && <div><span className="text-foreground">Phone:</span> {booking.clientPhone}</div>}
                  {booking?.message && (
                    <div>
                      <span className="text-foreground">Message:</span>
                      <p className="mt-1 whitespace-pre-wrap">{booking.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {!isCreate && booking && (
              <>
                {form.status === "pending" && (
                  <Button
                    onClick={() => handleStatusAction("confirmed")}
                    disabled={!!actionLoading}
                    className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                    size="sm"
                  >
                    {actionLoading === "confirmed" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    Confirm
                  </Button>
                )}
                {(form.status === "pending" || form.status === "confirmed") && onRequestDeposit && (
                  <Button
                    onClick={handleRequestDeposit}
                    disabled={!!actionLoading}
                    className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                    size="sm"
                  >
                    {actionLoading === "deposit" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5 mr-1.5" />}
                    Request Deposit
                  </Button>
                )}
                {(form.status === "deposit_requested" || form.status === "confirmed") && onMarkDeposit && (
                  <Button
                    onClick={handleMarkDeposit}
                    disabled={!!actionLoading}
                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    size="sm"
                  >
                    {actionLoading === "mark_deposit" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                    Mark Deposit Received
                  </Button>
                )}
                {form.status !== "completed" && form.status !== "cancelled" && (
                  <Button
                    onClick={() => handleStatusAction("completed")}
                    disabled={!!actionLoading}
                    className="bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20"
                    size="sm"
                  >
                    {actionLoading === "completed" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    Complete
                  </Button>
                )}
                {form.status !== "cancelled" && (
                  <Button
                    onClick={() => handleStatusAction("cancelled")}
                    disabled={!!actionLoading}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                    size="sm"
                  >
                    {actionLoading === "cancelled" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Ban className="w-3.5 h-3.5 mr-1.5" />}
                    Cancel
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={handleDelete}
                    disabled={!!actionLoading}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 ml-auto"
                    size="sm"
                  >
                    {actionLoading === "delete" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Save / Create */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              {isCreate ? "Create Booking" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
