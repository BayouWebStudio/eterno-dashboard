/*
  DESIGN: Dark Forge — Section Editor Page
  Master-detail layout: section list on left, editor panel on right.
  Each section card has a gold accent bar when active.
  Fields render dynamically based on type (text, textarea, photo, form_fields, style_options).
*/
import { useState, useMemo, useCallback, useRef } from "react";
import { useSite } from "@/contexts/SiteContext";
import { parseSections, type SectionGroup, type SectionField, type FormFieldDef } from "@/lib/parseHtml";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ChevronRight, Upload, Loader2, AlertCircle } from "lucide-react";

export default function SectionEditor() {
  const { siteHtml, loading, saveSiteField, uploadSiteImage, refreshHtml } = useSite();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const sections = useMemo(() => {
    if (!siteHtml) return [];
    return parseSections(siteHtml);
  }, [siteHtml]);

  // Auto-select first section
  const activeSec = sections.find((s) => s.id === activeSection) || sections[0] || null;

  const updateField = useCallback((key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeSec) return;
    setSaving(true);
    try {
      const fieldsToSave = activeSec.fields.filter((f) => f.type !== "form_fields" && f.type !== "style_options");
      const faqPairs = activeSec.faqPairs;

      let allOk = true;

      // Save regular fields
      for (const field of fieldsToSave) {
        const val = fieldValues[field.key] ?? (typeof field.value === "string" ? field.value : "");
        const ok = await saveSiteField(field.key, val);
        if (!ok) allOk = false;
      }

      // Save FAQ pairs
      if (faqPairs) {
        for (let i = 0; i < faqPairs.length; i++) {
          const qVal = fieldValues[`faq_q_${i}`] ?? faqPairs[i].question;
          const aVal = fieldValues[`faq_a_${i}`] ?? faqPairs[i].answer;
          const ok1 = await saveSiteField(`faq_q_${i}`, qVal);
          const ok2 = await saveSiteField(`faq_a_${i}`, aVal);
          if (!ok1 || !ok2) allOk = false;
        }
      }

      // Save style options
      const styleField = activeSec.fields.find((f) => f.type === "style_options");
      if (styleField) {
        const val = fieldValues[styleField.key] ?? (Array.isArray(styleField.value) ? styleField.value.join("\n") : "");
        const ok = await saveSiteField(styleField.key, val);
        if (!ok) allOk = false;
      }

      // Save form field placeholders
      const formField = activeSec.fields.find((f) => f.type === "form_fields");
      if (formField && Array.isArray(formField.value)) {
        for (let i = 0; i < formField.value.length; i++) {
          const key = `booking_form_field_${i}`;
          const val = fieldValues[key] ?? (formField.value as FormFieldDef[])[i]?.placeholder ?? "";
          const ok = await saveSiteField(key, val);
          if (!ok) allOk = false;
        }
      }

      if (allOk) {
        toast.success("Section saved successfully");
        setDirty(false);
        refreshHtml();
      } else {
        toast.error("Some fields failed to save");
      }
    } catch (err) {
      toast.error("Failed to save section");
    } finally {
      setSaving(false);
    }
  }, [activeSec, fieldValues, saveSiteField, refreshHtml]);

  if (loading && !siteHtml) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!siteHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">No site HTML loaded. Select a site first.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-6xl">
      {/* Section List (left panel) */}
      <div className="w-64 flex-shrink-0 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3 px-1">
          Sections ({sections.length})
        </p>
        {sections.map((sec) => {
          const isActive = sec.id === (activeSec?.id ?? "");
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`
                relative w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md
                transition-all duration-150
                ${isActive
                  ? "bg-[oklch(0.19_0.005_250)] text-gold"
                  : "text-muted-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
                }
              `}
            >
              <div
                className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-all duration-150 ${
                  isActive ? "bg-gold shadow-[0_0_8px_oklch(0.75_0.12_85/30%)]" : "bg-transparent"
                }`}
              />
              <span className="text-base flex-shrink-0">{sec.icon}</span>
              <span className="text-sm font-medium truncate">{sec.title}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Editor Panel (right) */}
      <div className="flex-1 min-w-0">
        {activeSec ? (
          <div className="bg-card border border-border rounded-lg">
            {/* Section Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">{activeSec.icon}</span>
                <h2 className="font-heading text-lg font-bold text-foreground">{activeSec.title}</h2>
              </div>
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
                Save {activeSec.title}
              </Button>
            </div>

            {/* Fields */}
            <div className="p-5 space-y-5">
              {/* Booking warning */}
              {activeSec.id === "booking" && (
                <div className="flex gap-3 p-3 rounded-md bg-[oklch(0.75_0.12_85/8%)] border border-gold-dim/25">
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <div className="text-xs text-gold-dim leading-relaxed">
                    <strong className="block mb-0.5 text-gold">Activate your booking form first</strong>
                    Booking emails won't arrive until activated. Submit a test booking from your site — formsubmit.co will email you a confirmation link. Click it to activate.
                  </div>
                </div>
              )}

              {/* Regular fields */}
              {activeSec.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={fieldValues[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                  onUpload={uploadSiteImage}
                />
              ))}

              {/* FAQ pairs */}
              {activeSec.faqPairs && (
                <div className="space-y-4">
                  {activeSec.faqPairs.map((pair, i) => (
                    <div key={i} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                          Question {i + 1}
                        </label>
                        <textarea
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[60px]"
                          defaultValue={pair.question}
                          onChange={(e) => updateField(`faq_q_${i}`, e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                          Answer {i + 1}
                        </label>
                        <textarea
                          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[60px]"
                          defaultValue={pair.answer}
                          onChange={(e) => updateField(`faq_a_${i}`, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unsaved indicator */}
            {dirty && (
              <div className="px-5 py-3 border-t border-border bg-[oklch(0.75_0.12_85/5%)]">
                <p className="text-xs text-gold-dim">You have unsaved changes</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Select a section to edit
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Field Renderer ── */
function FieldRenderer({
  field,
  value,
  onChange,
  onUpload,
}: {
  field: SectionField;
  value: string | undefined;
  onChange: (val: string) => void;
  onUpload: (file: File, folder?: string) => Promise<string | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (field.type === "photo") {
    const currentVal = value ?? (typeof field.value === "string" ? field.value : "");
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        {currentVal ? (
          <img
            src={currentVal}
            alt={field.label}
            className="w-full max-w-xs h-32 object-cover rounded-md border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full max-w-xs h-20 bg-[oklch(0.19_0.005_250)] rounded-md border border-border flex items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-border text-muted-foreground hover:text-gold hover:border-gold-dim"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 mr-1.5" />
          )}
          {currentVal ? "Change Photo" : "Upload Photo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const url = await onUpload(file, field.key.includes("hero") ? "hero" : "img");
            if (url) onChange(url);
            setUploading(false);
          }}
        />
      </div>
    );
  }

  if (field.type === "form_fields") {
    const fields = Array.isArray(field.value) ? (field.value as FormFieldDef[]) : [];
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Form Fields
        </label>
        <p className="text-xs text-muted-foreground">Edit the placeholder text that clients see on your booking form.</p>
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0 font-mono">{f.name}</span>
              <input
                type="text"
                className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                defaultValue={f.placeholder}
                placeholder="Placeholder text..."
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "style_options") {
    const optsText = Array.isArray(field.value) ? (field.value as string[]).join("\n") : (typeof field.value === "string" ? field.value : "");
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        <p className="text-xs text-muted-foreground">One option per line.</p>
        <textarea
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[120px]"
          defaultValue={value ?? optsText}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {field.label}
        </label>
        <textarea
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[80px]"
          defaultValue={value ?? (typeof field.value === "string" ? field.value : "")}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {field.label}
      </label>
      <input
        type="text"
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
        defaultValue={value ?? (typeof field.value === "string" ? field.value : "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
