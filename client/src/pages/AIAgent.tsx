/*
  DESIGN: Dark Forge — AI Agent Page
  Configure AI agent settings and view leads/call history.
  Two tabs: Configuration and Leads & Calls.
*/
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Bot,
  Phone,
  MessageSquare,
  Globe,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──

interface AgentConfig {
  configured: boolean;
  slug: string;
  businessName: string;
  businessType: string;
  hours: string;
  services: string;
  pricing: string;
  location: string;
  phone: string;
  twilioPhoneNumber?: string;
  whatsappEnabled: boolean;
  voiceEnabled: boolean;
  chatEnabled: boolean;
  customFaq?: string;
  systemPrompt: string;
  createdAt: number;
}

interface AgentLead {
  _id: string;
  channel: string;
  callerName?: string;
  callerPhone?: string;
  summary: string;
  transcript?: string;
  createdAt: number;
}

type Tab = "config" | "leads";
type ChannelFilter = "all" | "voice" | "whatsapp" | "chat";

export default function AIAgent() {
  const { getToken, convexHttpUrl } = useAuth();

  const [tab, setTab] = useState<Tab>("config");
  const [configLoading, setConfigLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    hours: "",
    services: "",
    pricing: "",
    location: "",
    phone: "",
    voiceEnabled: true,
    whatsappEnabled: false,
    chatEnabled: false,
    customFaq: "",
  });

  // ── Auth fetch helper ──
  const authFetch = useCallback(
    async (path: string, options?: RequestInit): Promise<Response> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string> || {}),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${convexHttpUrl}${path}`, { ...options, headers });
    },
    [convexHttpUrl, getToken]
  );

  // ── Fetch config ──
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await authFetch("/api/agent/config");
      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          setConfig(data);
          setForm({
            businessName: data.businessName || "",
            businessType: data.businessType || "",
            hours: data.hours || "",
            services: data.services || "",
            pricing: data.pricing || "",
            location: data.location || "",
            phone: data.phone || "",
            voiceEnabled: data.voiceEnabled ?? true,
            whatsappEnabled: data.whatsappEnabled ?? false,
            chatEnabled: data.chatEnabled ?? false,
            customFaq: data.customFaq || "",
          });
        } else {
          setConfig(null);
        }
      }
    } catch {
      toast.error("Failed to load agent config");
    } finally {
      setConfigLoading(false);
    }
  }, [authFetch]);

  // ── Fetch leads ──
  const fetchLeads = useCallback(async (channel?: ChannelFilter) => {
    setLeadsLoading(true);
    try {
      const q = channel && channel !== "all" ? `?channel=${channel}` : "";
      const res = await authFetch(`/api/agent/leads${q}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLeadsLoading(false);
    }
  }, [authFetch]);

  // ── Initial load ──
  useEffect(() => {
    fetchConfig();
    fetchLeads();
  }, [fetchConfig, fetchLeads]);

  // ── Filter change ──
  useEffect(() => {
    fetchLeads(channelFilter);
  }, [channelFilter, fetchLeads]);

  // ── Save config ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Agent config saved");
        fetchConfig();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save config");
      }
    } catch {
      toast.error("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  // ── Analytics (derived from leads) ──
  const analytics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return {
      totalVoice: leads.filter((l) => l.channel === "voice").length,
      totalWhatsapp: leads.filter((l) => l.channel === "whatsapp").length,
      totalChat: leads.filter((l) => l.channel === "chat").length,
      thisMonth: leads.filter((l) => l.createdAt >= monthStart).length,
    };
  }, [leads]);

  // ── Form field helper ──
  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Loading state ──
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">AI Agent</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your AI phone agent and view call history
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[oklch(0.15_0.005_250)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "config"
              ? "bg-[oklch(0.22_0.005_250)] text-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Configuration
        </button>
        <button
          onClick={() => setTab("leads")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "leads"
              ? "bg-[oklch(0.22_0.005_250)] text-gold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Leads & Calls
        </button>
      </div>

      {/* ── Tab: Configuration ── */}
      {tab === "config" && (
        <div className="space-y-6">
          {/* Phone Number Status */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[oklch(0.19_0.005_250)] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Phone Number</p>
                  {config?.twilioPhoneNumber ? (
                    <p className="text-sm text-gold font-mono">{config.twilioPhoneNumber}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No phone number assigned</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {config?.twilioPhoneNumber ? (
                  <>
                    {config.voiceEnabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Phone className="w-3 h-3" /> Voice
                      </span>
                    )}
                    {config.whatsappEnabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </span>
                    )}
                    {config.chatEnabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Globe className="w-3 h-3" /> Chat
                      </span>
                    )}
                  </>
                ) : (
                  <a
                    href="mailto:support@eternowebstudio.com?subject=Request%20AI%20Agent%20Phone%20Number"
                    className="text-xs text-gold hover:text-gold/80 transition-colors underline"
                  >
                    Request a Number
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Business Info Form */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Business Information</h3>
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
                Save
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business Name" value={form.businessName} onChange={(v) => updateField("businessName", v)} />
              <Field label="Business Type" value={form.businessType} onChange={(v) => updateField("businessType", v)} placeholder="e.g. Tattoo Studio, Barbershop" />
              <Field label="Location" value={form.location} onChange={(v) => updateField("location", v)} placeholder="City, State" />
              <Field label="Transfer Phone" value={form.phone} onChange={(v) => updateField("phone", v)} placeholder="Number to transfer calls to" />
            </div>

            <TextareaField label="Business Hours" value={form.hours} onChange={(v) => updateField("hours", v)} placeholder="e.g. Mon-Fri 10am-7pm, Sat 11am-5pm" rows={2} />
            <TextareaField label="Services" value={form.services} onChange={(v) => updateField("services", v)} placeholder="List your services, one per line" rows={3} />
            <TextareaField label="Pricing" value={form.pricing} onChange={(v) => updateField("pricing", v)} placeholder="Pricing info the agent can share" rows={3} />
            <TextareaField label="Custom FAQ" value={form.customFaq} onChange={(v) => updateField("customFaq", v)} placeholder="Common questions and answers" rows={4} />

            {/* Channel toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Channels</p>
              <Toggle label="Voice Calls" checked={form.voiceEnabled} onChange={(v) => updateField("voiceEnabled", v)} />
              <Toggle label="WhatsApp" checked={form.whatsappEnabled} onChange={(v) => updateField("whatsappEnabled", v)} />
              <Toggle label="Website Chat" checked={form.chatEnabled} onChange={(v) => updateField("chatEnabled", v)} />
            </div>
          </div>

          {/* System Prompt Preview */}
          {config?.systemPrompt && (
            <div className="bg-card border border-border rounded-lg">
              <button
                onClick={() => setPromptOpen(!promptOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                System Prompt Preview
                {promptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {promptOpen && (
                <div className="px-5 pb-4">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-[oklch(0.12_0.005_250)] rounded-md p-4 max-h-80 overflow-y-auto">
                    {config.systemPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Leads & Calls ── */}
      {tab === "leads" && (
        <div className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Voice Calls" value={analytics.totalVoice} icon={Phone} />
            <StatCard label="WhatsApp" value={analytics.totalWhatsapp} icon={MessageSquare} />
            <StatCard label="Chat" value={analytics.totalChat} icon={Globe} />
            <StatCard label="This Month" value={analytics.thisMonth} icon={Bot} />
          </div>

          {/* Channel Filter */}
          <div className="flex gap-1 bg-[oklch(0.15_0.005_250)] rounded-lg p-1 w-fit">
            {(["all", "voice", "whatsapp", "chat"] as ChannelFilter[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  channelFilter === ch
                    ? "bg-[oklch(0.22_0.005_250)] text-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Leads Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {leadsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Bot className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No leads yet</p>
                <p className="text-xs text-muted-foreground">
                  Leads will appear here when your AI agent receives calls
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Table header */}
                <div className="grid grid-cols-[100px_80px_1fr_120px_1fr] gap-3 px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-[oklch(0.14_0.005_250)]">
                  <span>Date</span>
                  <span>Channel</span>
                  <span>Name</span>
                  <span>Phone</span>
                  <span>Summary</span>
                </div>

                {leads.map((lead) => (
                  <div key={lead._id}>
                    <button
                      onClick={() => setExpandedLead(expandedLead === lead._id ? null : lead._id)}
                      className="w-full grid grid-cols-[100px_80px_1fr_120px_1fr] gap-3 px-4 py-3 text-sm text-left hover:bg-[oklch(0.16_0.005_250)] transition-colors"
                    >
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span>
                        <ChannelBadge channel={lead.channel} />
                      </span>
                      <span className="text-foreground truncate">{lead.callerName || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">{lead.callerPhone || "—"}</span>
                      <span className="text-xs text-muted-foreground truncate">{lead.summary}</span>
                    </button>
                    {expandedLead === lead._id && lead.transcript && (
                      <div className="px-4 pb-4">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-[oklch(0.12_0.005_250)] rounded-md p-4 max-h-60 overflow-y-auto">
                          {lead.transcript}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </label>
      <input
        type="text"
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </label>
      <textarea
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-gold" : "bg-[oklch(0.25_0.005_250)]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const styles: Record<string, string> = {
    voice: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
    chat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
        styles[channel] || "bg-gray-500/10 text-gray-400 border-gray-500/20"
      }`}
    >
      {channel}
    </span>
  );
}
