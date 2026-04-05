/*
  DESIGN: Dark Forge — Assign Inquiry to Calendar
  Compact modal: pre-filled client info, date picker, time, service.
*/
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
}

interface AssignToCalendarModalProps {
  open: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onAssign: (data: {
    inquiryId: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    service?: string;
    message: string;
    date: string;
    startTime?: string;
    endTime?: string;
  }) => Promise<void>;
}

export default function AssignToCalendarModal({ open, onClose, inquiry, onAssign }: AssignToCalendarModalProps) {
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [service, setService] = useState(inquiry?.service || "");
  const [saving, setSaving] = useState(false);

  // Reset when inquiry changes
  const inquiryId = inquiry?._id || "";
  const [prevId, setPrevId] = useState(inquiryId);
  if (inquiryId !== prevId) {
    setPrevId(inquiryId);
    setDate("");
    setStartTime("");
    setEndTime("");
    setService(inquiry?.service || "");
  }

  const handleAssign = async () => {
    if (!inquiry) return;
    if (!date) { toast.error("Please select a date"); return; }
    setSaving(true);
    try {
      await onAssign({
        inquiryId: inquiry._id,
        clientName: inquiry.name,
        clientEmail: inquiry.email,
        clientPhone: inquiry.phone,
        service: service.trim() || undefined,
        message: inquiry.message,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      onClose();
    } catch {
      toast.error("Failed to assign booking");
    } finally {
      setSaving(false);
    }
  };

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[oklch(0.14_0.005_250)] border-border text-foreground max-w-sm p-0">
        <DialogTitle className="sr-only">Assign to Calendar</DialogTitle>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-heading font-bold text-foreground">Assign to Calendar</h3>
          </div>

          {/* Client info summary */}
          <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-3 space-y-1">
            <div className="text-sm font-medium text-foreground">{inquiry.name}</div>
            <div className="text-xs text-muted-foreground">{inquiry.email}</div>
            {inquiry.phone && <div className="text-xs text-muted-foreground">{inquiry.phone}</div>}
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</label>
            <div className="border border-border rounded-lg bg-[oklch(0.16_0.005_250)] p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={date ? new Date(date + "T12:00:00") : undefined}
                onSelect={(d) => {
                  if (d) {
                    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    setDate(iso);
                  }
                }}
              />
            </div>
            {date && (
              <div className="text-xs text-gold text-center">
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
            )}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Start</label>
              <input
                type="time"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">End</label>
              <input
                type="time"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Service</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. Full sleeve, portrait..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button onClick={onClose} variant="ghost" size="sm" className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={saving || !date}
              className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
              size="sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
