/*
  DESIGN: Dark Forge — AI Agent Management
  Clients configure their AI phone/WhatsApp agent, view call history and leads.
*/
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot,
  Phone,
  MessageCircle,
  MessagesSquare,
  CalendarDays,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  PhoneIncoming,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */

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

/* ── Tab Button ── */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors rounded-md ${
        active
          ? "bg-gold/15 text-gold border border-gold/25"
          : "text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Phone Number Status ── */
function PhoneStatus({ config }: { config: AgentConfig | null }) {
  if (!config?.twilioPhoneNumber) {
    return (
      <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center">
            <Phone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No phone number assigned</p>
            <p className="text-xs text-muted-foreground/60">Contact support to get a dedicated AI phone number.</p>
          </div>
        </div>
        <a
          href="mailto:bayouwebstudio@gmail.com?subject=AI Agent Phone Number Request"
          className="text-xs font-medium text-gold hover:text-gold/80 transition-colors"
        >
          Request a Number
        </a>
      </div>
    );
  }

  return (
    <div className="bg-[oklch(0.16_0.005_250)] border border-gold/20 rounded-lg p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <PhoneCall className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{config.twilioPhoneNumber}</p>
          <div className="flex items-center gap-2 mt-1">
            {config.voiceEnabled && (
              <span className="text-[10px] font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
                VOICE
              </span>
            )}
            {config.whatsappEnabled && (
              <span className="text-[10px] font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
                WHATSAPP
              </span>
            )}
            {config.chatEnabled && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">
                CHAT
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Active
      </span>
    </div>
  );
}

/* ── Business Info Form ── */
function ConfigForm({
  config,
  onSave,
  saving,
}: {
  config: AgentConfig | null;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [services, setServices] = useState("");
  const [pricing, setPricing] = useState("");
  const [customFaq, setCustomFaq] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (config?.configured) {
      setBusinessName(config.businessName || "");
      setBusinessType(config.businessType || "");
      setLocation(config.location || "");
      setPhone(config.phone || "");
      setHours(config.hours || "");
      setServices(config.services || "");
      setPricing(config.pricing || "");
      setCustomFaq(config.customFaq || "");
      setVoiceEnabled(config.voiceEnabled ?? true);
      setWhatsappEnabled(config.whatsappEnabled ?? false);
      setChatEnabled(config.chatEnabled ?? false);
    }
  }, [config]);

  const handleSubmit = () => {
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    onSave({
      businessName: businessName.trim(),
      businessType: businessType.trim(),
      location: location.trim(),
      phone: phone.trim(),
      hours: hours.trim(),
      services: services.trim(),
      pricing: pricing.trim(),
      customFaq: customFaq.trim() || undefined,
      voiceEnabled,
      whatsappEnabled,
      chatEnabled,
    });
  };

  const labelClass = "block text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5";
  const inputClass =
    "w-full bg-[oklch(0.13_0.005_250)] border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors";
  const textareaClass = `${inputClass} resize-vertical min-h-[80px]`;

  return (
    <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-gold text-[oklch(0.13_0.005_250)] text-xs font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business Name *</label>
          <input className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Tattoo Temple Houston" />
        </div>
        <div>
          <label className={labelClass}>Business Type</label>
          <input className={inputClass} value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="Tattoo Shop, Barbershop..." />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Houston, TX" />
        </div>
        <div>
          <label className={labelClass}>Transfer Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Number to transfer calls to" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Operating Hours</label>
        <textarea className={textareaClass} value={hours} onChange={(e) => setHours(e.target.value)} placeholder={"Mon-Fri: 10am - 7pm\nSat: 11am - 5pm\nSun: Closed"} />
      </div>

      <div>
        <label className={labelClass}>Services</label>
        <textarea className={textareaClass} value={services} onChange={(e) => setServices(e.target.value)} placeholder="Custom tattoos, cover-ups, piercings, consultations..." />
      </div>

      <div>
        <label className={labelClass}>Pricing</label>
        <textarea className={textareaClass} value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder={"Minimum: $100\nHourly rate: $150/hr\nConsultations: Free"} />
      </div>

      <div>
        <label className={labelClass}>Custom FAQ (Optional)</label>
        <textarea
          className={`${textareaClass} min-h-[100px]`}
          value={customFaq}
          onChange={(e) => setCustomFaq(e.target.value)}
          placeholder={"Q: Do you do walk-ins?\nA: We accept walk-ins on weekdays, but appointments are recommended.\n\nQ: What's the minimum age?\nA: 18 with valid ID."}
        />
      </div>

      {/* Channel toggles */}
      <div className="space-y-3 pt-2">
        <h4 className={labelClass}>Channels</h4>
        <ToggleRow label="Voice Calls" description="AI answers phone calls" enabled={voiceEnabled} onChange={setVoiceEnabled} />
        <ToggleRow label="WhatsApp" description="AI responds to WhatsApp messages" enabled={whatsappEnabled} onChange={setWhatsappEnabled} />
        <ToggleRow label="Web Chat" description="AI chat widget on your site" enabled={chatEnabled} onChange={setChatEnabled} />
      </div>

      {/* System prompt preview */}
      {config?.systemPrompt && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPrompt ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            System Prompt Preview
          </button>
          {showPrompt && (
            <pre className="mt-3 p-3 bg-[oklch(0.11_0.005_250)] border border-border rounded-md text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {config.systemPrompt}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Toggle Row ── */
function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-[oklch(0.13_0.005_250)] border border-border rounded-md">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-gold" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

/* ── Analytics Cards ── */
function AnalyticsCards({ leads }: { leads: AgentLead[] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const voice = leads.filter((l) => l.channel === "voice").length;
    const whatsapp = leads.filter((l) => l.channel === "whatsapp").length;
    const chat = leads.filter((l) => l.channel === "chat").length;
    const thisMonth = leads.filter((l) => {
      const d = new Date(l.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    return { voice, whatsapp, chat, thisMonth };
  }, [leads, currentMonth, currentYear]);

  const cards = [
    { label: "Voice Calls", value: stats.voice, icon: Phone, color: "text-gold" },
    { label: "WhatsApp", value: stats.whatsapp, icon: MessageCircle, color: "text-green-400" },
    { label: "Web Chat", value: stats.chat, icon: MessagesSquare, color: "text-blue-400" },
    { label: "This Month", value: stats.thisMonth, icon: CalendarDays, color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{c.label}</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Lead Row ── */
function LeadRow({ lead, expanded, onToggle }: { lead: AgentLead; expanded: boolean; onToggle: () => void }) {
  const date = new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = new Date(lead.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const channelBadge = (() => {
    switch (lead.channel) {
      case "voice":
        return <span className="text-[10px] font-medium text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">VOICE</span>;
      case "whatsapp":
        return <span className="text-[10px] font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">WHATSAPP</span>;
      case "chat":
        return <span className="text-[10px] font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">CHAT</span>;
      default:
        return <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded-full">{lead.channel.toUpperCase()}</span>;
    }
  })();

  return (
    <div className={`bg-[oklch(0.16_0.005_250)] border rounded-lg overflow-hidden ${expanded ? "border-gold/20" : "border-border"}`}>
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-[oklch(0.18_0.005_250)] transition-colors">
        <span className="text-xs text-muted-foreground flex-shrink-0 w-16">
          {date}<br /><span className="text-muted-foreground/60">{time}</span>
        </span>
        <span className="flex-shrink-0">{channelBadge}</span>
        <span className="text-sm text-foreground flex-shrink-0 w-28 truncate">{lead.callerName || "Unknown"}</span>
        {lead.callerPhone && (
          <span className="text-xs text-muted-foreground flex-shrink-0 w-28 truncate">{lead.callerPhone}</span>
        )}
        <span className="text-xs text-muted-foreground truncate flex-1">{lead.summary}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && lead.transcript && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-3 mb-2">Transcript</p>
          <pre className="p-3 bg-[oklch(0.11_0.005_250)] border border-border rounded-md text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {lead.transcript}
          </pre>
        </div>
      )}
      {expanded && !lead.transcript && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs text-muted-foreground/60 mt-3">No transcript available for this interaction.</p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function AIAgent() {
  const { getToken, convexHttpUrl } = useAuth();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "leads">("config");
  const [channelFilter, setChannelFilter] = useState("all");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

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

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await authFetch("/api/agent/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        setConfig(null);
      }
    } catch {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, [authFetch]);

  const loadLeads = useCallback(
    async (channel?: string) => {
      setLeadsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (channel && channel !== "all") params.set("channel", channel);
        const res = await authFetch(`/api/agent/leads?${params}`);
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch {
        toast.error("Failed to load leads");
      } finally {
        setLeadsLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    loadConfig();
    loadLeads();
  }, [loadConfig, loadLeads]);

  const handleFilterChange = (ch: string) => {
    setChannelFilter(ch);
    loadLeads(ch);
  };

  const handleSaveConfig = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await authFetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Save failed");
      }
      toast.success("Agent configuration saved");
      await loadConfig();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const loading = configLoading || leadsLoading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">AI Agent</h2>
            <p className="text-xs text-muted-foreground">
              {config?.configured ? "Manage your AI phone assistant" : "Set up your AI phone assistant"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { loadConfig(); loadLeads(channelFilter); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-[oklch(0.16_0.005_250)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabBtn active={activeTab === "config"} onClick={() => setActiveTab("config")}>
          Configuration
        </TabBtn>
        <TabBtn active={activeTab === "leads"} onClick={() => setActiveTab("leads")}>
          Leads & Calls
          {leads.length > 0 && (
            <span className="ml-1.5 text-[10px] bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 rounded-full">
              {leads.length}
            </span>
          )}
        </TabBtn>
      </div>

      {configLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading agent configuration...
        </div>
      ) : activeTab === "config" ? (
        <div className="space-y-4">
          <PhoneStatus config={config} />
          <ConfigForm config={config} onSave={handleSaveConfig} saving={saving} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Analytics */}
          <AnalyticsCards leads={leads} />

          {/* Channel filter */}
          <div className="flex items-center gap-2">
            {["all", "voice", "whatsapp", "chat"].map((ch) => (
              <button
                key={ch}
                onClick={() => handleFilterChange(ch)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  channelFilter === ch
                    ? "bg-gold/15 text-gold border border-gold/25"
                    : "text-muted-foreground hover:text-foreground border border-border hover:border-border"
                }`}
              >
                {ch === "all" ? "All" : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>

          {/* Leads list */}
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[oklch(0.18_0.005_250)] flex items-center justify-center">
                <PhoneIncoming className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No interactions yet</p>
              <p className="text-xs text-muted-foreground/60">
                When your AI agent handles a call or message, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <LeadRow
                  key={lead._id}
                  lead={lead}
                  expanded={expandedLeadId === lead._id}
                  onToggle={() => setExpandedLeadId(expandedLeadId === lead._id ? null : lead._id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
