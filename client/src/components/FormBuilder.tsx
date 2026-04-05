/*
  DESIGN: Dark Forge — Form Builder
  Drag-free form field editor for booking forms.
  Clients can add/remove fields, change types, toggle required, reorder.
  Saves via saveSiteField("booking_fields", JSON).
*/
import { useState, useCallback } from "react";
import { useSite } from "@/contexts/SiteContext";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[]; // for select type
}

const DEFAULT_FIELDS: FormField[] = [
  { id: "bname", label: "Your Name", placeholder: "Full name", type: "text", required: true },
  { id: "bemail", label: "Email", placeholder: "your@email.com", type: "email", required: true },
  { id: "bphone", label: "Phone", placeholder: "(555) 123-4567", type: "tel", required: false },
  { id: "bmessage", label: "Message", placeholder: "Tell us about your idea...", type: "textarea", required: true },
];

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
];

interface FormBuilderProps {
  initialFields?: FormField[];
  submitText?: string;
}

export default function FormBuilder({ initialFields, submitText: initSubmitText }: FormBuilderProps) {
  const { saveSiteField, refreshHtml } = useSite();
  const [fields, setFields] = useState<FormField[]>(initialFields?.length ? initialFields : DEFAULT_FIELDS);
  const [submitText, setSubmitText] = useState(initSubmitText || "Send Booking Request");
  const [saving, setSaving] = useState(false);

  const addField = useCallback(() => {
    const id = `field_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      { id, label: "New Field", placeholder: "", type: "text", required: false },
    ]);
  }, []);

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateField = useCallback((index: number, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  }, []);

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setFields(DEFAULT_FIELDS);
    setSubmitText("Send Booking Request");
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = JSON.stringify({ fields, submitText });
      const ok = await saveSiteField("booking_fields", payload);
      if (ok) {
        toast.success("Booking form updated");
        refreshHtml("booking.html");
      } else {
        toast.error("Failed to update form");
      }
    } catch {
      toast.error("Failed to update form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Form Fields</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add, remove, or reorder fields on your booking form
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
            size="sm"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save Form
          </Button>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 space-y-3"
          >
            {/* Field header row */}
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  className="bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field label"
                />
                <select
                  className="bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as FormField["type"] })}
                >
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeField(index)}
                    className="p-1 text-red-400/60 hover:text-red-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Field details row */}
            <div className="flex items-center gap-3 pl-6">
              <input
                type="text"
                className="flex-1 bg-input border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={field.placeholder}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                placeholder="Placeholder text..."
              />
              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-border text-gold focus:ring-gold/30 bg-input"
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </label>
            </div>

            {/* Dropdown options (only for select type) */}
            {field.type === "select" && (
              <div className="pl-6 space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Options (one per line)
                </label>
                <textarea
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y"
                  value={(field.options || []).join("\n")}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value.split("\n").filter((l) => l.trim()),
                    })
                  }
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={3}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Field Button */}
      <button
        onClick={addField}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-gold/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Field
      </button>

      {/* Submit Button Text */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Submit Button Text
        </label>
        <input
          type="text"
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
          value={submitText}
          onChange={(e) => setSubmitText(e.target.value)}
          placeholder="Send Booking Request"
        />
      </div>
    </div>
  );
}
