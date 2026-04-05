/*
  DESIGN: Dark Forge — Booking Calendar
  Monthly grid with booking chips inside day cells.
  Uses date-fns for date math, custom grid (not react-day-picker) for full control over cell rendering.
*/
import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths,
} from "date-fns";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";
import type { CalendarBooking } from "./BookingDetailModal";

const STATUS_COLORS: Record<string, { chip: string; dot: string }> = {
  pending:           { chip: "bg-gold/15 text-gold border-gold/25", dot: "bg-gold" },
  confirmed:         { chip: "bg-blue-400/15 text-blue-400 border-blue-400/25", dot: "bg-blue-400" },
  deposit_requested: { chip: "bg-amber-400/15 text-amber-400 border-amber-400/25", dot: "bg-amber-400" },
  deposit_received:  { chip: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25", dot: "bg-emerald-400" },
  completed:         { chip: "bg-gray-400/15 text-gray-400 border-gray-400/25", dot: "bg-gray-400" },
  cancelled:         { chip: "bg-red-400/15 text-red-400 border-red-400/25", dot: "bg-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", deposit_requested: "Deposit Req.",
  deposit_received: "Deposit Paid", completed: "Completed", cancelled: "Cancelled",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BookingCalendarProps {
  bookings: CalendarBooking[];
  onClickBooking: (booking: CalendarBooking) => void;
  onClickAdd: (date?: string) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export default function BookingCalendar({
  bookings, onClickBooking, onClickAdd, currentMonth, onMonthChange,
}: BookingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Build calendar grid (6 rows x 7 cols)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const b of bookings) {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    }
    // Sort each day's bookings by startTime
    for (const date of Object.keys(map)) {
      map[date].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return map;
  }, [bookings]);

  const selectedDayBookings = selectedDay ? (bookingsByDate[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-[oklch(0.18_0.005_250)] rounded-md transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-heading font-bold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-[oklch(0.18_0.005_250)] rounded-md transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate[dateStr] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(dateStr)}
              className={`
                min-h-[80px] p-1.5 flex flex-col items-stretch text-left transition-colors
                ${inMonth ? "bg-[oklch(0.14_0.005_250)]" : "bg-[oklch(0.12_0.005_250)]"}
                hover:bg-[oklch(0.18_0.005_250)]
                ${selectedDay === dateStr ? "ring-1 ring-gold/40" : ""}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-xs font-medium leading-none
                  ${today ? "text-gold font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/40"}
                `}>
                  {format(day, "d")}
                </span>
                {dayBookings.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{dayBookings.length - 3}</span>
                )}
              </div>

              {/* Booking chips (max 3) */}
              <div className="flex flex-col gap-0.5 flex-1">
                {dayBookings.slice(0, 3).map((b) => {
                  const colors = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                  return (
                    <div
                      key={b._id}
                      onClick={(e) => { e.stopPropagation(); onClickBooking(b); }}
                      className={`
                        text-[9px] leading-tight px-1 py-0.5 rounded border truncate cursor-pointer
                        hover:brightness-125 transition-all
                        ${colors.chip}
                      `}
                      title={`${b.clientName}${b.startTime ? ` @ ${b.startTime}` : ""}`}
                    >
                      {b.startTime ? `${b.startTime} ` : ""}{b.clientName}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail side panel */}
      <Sheet open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <SheetContent side="right" className="bg-[oklch(0.14_0.005_250)] border-border w-[360px] sm:w-[400px] p-0">
          <SheetHeader className="p-5 pb-3 border-b border-border">
            <SheetTitle className="text-foreground font-heading">
              {selectedDay
                ? new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : ""}
            </SheetTitle>
          </SheetHeader>

          <div className="p-5 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            {/* Add booking for this day */}
            <button
              onClick={() => { setSelectedDay(null); onClickAdd(selectedDay || undefined); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-gold/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Booking
            </button>

            {selectedDayBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No bookings for this day</p>
            ) : (
              selectedDayBookings.map((b) => {
                const colors = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                return (
                  <button
                    key={b._id}
                    onClick={() => { setSelectedDay(null); onClickBooking(b); }}
                    className="w-full bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-3 text-left hover:border-gold/30 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{b.clientName}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${colors.chip}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </div>
                    {(b.startTime || b.service) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {b.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {b.startTime}{b.endTime ? ` – ${b.endTime}` : ""}
                          </span>
                        )}
                        {b.service && <span>{b.service}</span>}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
