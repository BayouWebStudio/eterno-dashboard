/*
  DESIGN: Dark Forge — Dashboard Layout
  Left sidebar (collapsible) + header strip + main content area.
  Sidebar uses gold accent bar for active item.
*/
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  LayoutDashboard,
  FileEdit,
  Image,
  ShoppingBag,
  Palette,
  Globe,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/sections", label: "Sections", icon: FileEdit },
  { path: "/gallery", label: "Gallery", icon: Image },
  { path: "/store", label: "Store", icon: ShoppingBag },
  { path: "/themes", label: "Themes", icon: Palette },
  { path: "/i18n", label: "Languages", icon: Globe },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { userName, userImage, signOut } = useAuth();
  const { sites, currentSite, selectSite, loading } = useSite();
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          bg-[oklch(0.13_0.005_250)] border-r border-border
          transition-all duration-150 ease-out
          ${collapsed ? "w-16" : "w-56"}
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-3">
          <div className="w-7 h-7 rounded bg-gold flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[oklch(0.13_0.005_250)]">E</span>
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-sm text-gold tracking-wide truncate">
              ETERNO
            </span>
          )}
        </div>

        {/* Site Selector */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-border">
            <div className="relative">
              <button
                onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[oklch(0.16_0.005_250)] hover:bg-[oklch(0.19_0.005_250)] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Current Site</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {loading ? "Loading..." : currentSite?.name || "No site"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>
              {siteDropdownOpen && sites.length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.18_0.005_250)] border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {sites.map((site) => (
                    <button
                      key={site.slug}
                      onClick={() => {
                        selectSite(site.slug);
                        setSiteDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[oklch(0.22_0.005_250)] transition-colors ${
                        site.slug === currentSite?.slug ? "text-gold" : "text-foreground"
                      }`}
                    >
                      {site.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-md
                    transition-all duration-150 ease-out group
                    ${isActive
                      ? "bg-[oklch(0.19_0.005_250)] text-gold"
                      : "text-muted-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
                    }
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  {/* Left accent bar */}
                  <div
                    className={`
                      absolute left-0 top-1 bottom-1 w-[3px] rounded-full
                      transition-all duration-150
                      ${isActive ? "bg-gold shadow-[0_0_8px_oklch(0.75_0.12_85/30%)]" : "bg-transparent"}
                    `}
                  />
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${collapsed ? "" : "ml-1"}`} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Visit Site Link */}
        {currentSite?.domain && !collapsed && (
          <div className="px-3 pb-2">
            <a
              href={`https://${currentSite.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-gold transition-colors rounded-md hover:bg-[oklch(0.16_0.005_250)]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="truncate">Visit Site</span>
            </a>
          </div>
        )}

        {/* User & Collapse */}
        <div className="border-t border-border p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-3 px-1">
              {userImage ? (
                <img src={userImage} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[oklch(0.22_0.005_250)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{userName || "User"}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-[oklch(0.16_0.005_250)]"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`
          flex-1 min-h-screen transition-all duration-150 ease-out
          ${collapsed ? "ml-16" : "ml-56"}
        `}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 bg-[oklch(0.13_0.005_250)]/80 backdrop-blur-md border-b border-border">
          <div>
            <h1 className="font-heading font-bold text-base text-foreground">
              {NAV_ITEMS.find((n) => n.path === location || (n.path !== "/" && location.startsWith(n.path)))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {currentSite && (
              <span className="text-xs font-mono text-muted-foreground">
                {currentSite.slug}
              </span>
            )}
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Site live" />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
