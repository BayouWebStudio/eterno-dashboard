/*
  DESIGN: Dark Forge — Store Page
  Manage shop/store section settings: title, description, external link.
  Shows parsed shop data from site HTML.
*/
import { useState, useMemo, useCallback } from "react";
import { useSite } from "@/contexts/SiteContext";
import { parseSections } from "@/lib/parseHtml";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Loader2, ShoppingBag, ExternalLink } from "lucide-react";

export default function Store() {
  const { siteHtml, loading, saveSiteField, refreshHtml } = useSite();
  const [saving, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const shopSection = useMemo(() => {
    if (!siteHtml) return null;
    const sections = parseSections(siteHtml);
    return sections.find((s) => s.id === "shop") || null;
  }, [siteHtml]);

  const handleSave = useCallback(async () => {
    if (!shopSection) return;
    setSaving(true);
    try {
      let allOk = true;
      for (const field of shopSection.fields) {
        const val = fieldValues[field.key] ?? (typeof field.value === "string" ? field.value : "");
        const ok = await saveSiteField(field.key, val);
        if (!ok) allOk = false;
      }
      if (allOk) {
        toast.success("Store settings saved");
        refreshHtml();
      } else {
        toast.error("Some fields failed to save");
      }
    } catch {
      toast.error("Failed to save store settings");
    } finally {
      setSaving(false);
    }
  }, [shopSection, fieldValues, saveSiteField, refreshHtml]);

  if (loading && !siteHtml) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!shopSection) {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-col items-center justify-center h-64 bg-card border border-border rounded-lg gap-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-foreground font-medium mb-1">No Shop Section Found</p>
            <p className="text-sm text-muted-foreground">
              This site doesn't have a shop section in its HTML. Add a shop section to your site template to manage it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Store Settings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your shop section content and links
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
          size="sm"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save
        </Button>
      </div>

      {/* Fields */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        {shopSection.fields.map((field) => {
          const currentVal = fieldValues[field.key] ?? (typeof field.value === "string" ? field.value : "");
          return (
            <div key={field.key} className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y min-h-[80px]"
                  defaultValue={currentVal}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  rows={4}
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                    defaultValue={currentVal}
                    onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                  {field.key.includes("link") && currentVal && (
                    <a
                      href={currentVal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 bg-[oklch(0.19_0.005_250)] border border-border rounded-md text-muted-foreground hover:text-gold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
