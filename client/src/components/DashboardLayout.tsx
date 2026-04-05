/*
  DESIGN: Dark Forge — Dashboard Layout
  Left sidebar (collapsible) + header strip + main content area.
  Sidebar uses gold accent bar for active item.
*/
import { useState, type ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FileEdit,
  ShoppingBag,
  Palette,
  Globe,
  CreditCard,
  Bot,
  CalendarDays,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Menu,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/sections", label: "Editor", icon: FileEdit },
  { path: "/store", label: "Store", icon: ShoppingBag },
  { path: "/themes", label: "Themes", icon: Palette },
  { path: "/i18n", label: "Languages", icon: Globe },
  { path: "/billing", label: "Billing", icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { userName, userImage, signOut } = useAuth();
  const { currentSite, loading, availablePages, onboardingStatus } = useSite();

  // Redirect new users (no site built) to onboarding on the overview page
  if (onboardingStatus === "none" && location !== "/") {
    return <Redirect to="/" />;
  }

  const hasBookingPage = availablePages.includes("booking.html");
  const hasTestimonialsPage = availablePages.includes("testimonials.html") || availablePages.includes("reviews.html");
  const hasAgent = currentSite?.hasAgent ?? false;
  const newBookings = currentSite?.newBookings ?? 0;
  const pendingTestimonials = currentSite?.pendingTestimonials ?? 0;
  const NAV_ITEMS: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(hasBookingPage ? [{ path: "/bookings", label: "Bookings", icon: CalendarDays, badge: newBookings }] : []),
    ...(hasTestimonialsPage ? [{ path: "/testimonials", label: "Testimonials", icon: MessageSquare, badge: pendingTestimonials }] : []),
    ...(hasAgent ? [{ path: "/ai-agent", label: "AI Agent", icon: Bot }] : []),
  ];

  /** Renders nav items — shared between desktop sidebar and mobile sheet */
  const renderNav = (showLabels: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => { setLocation(item.path); onNavigate?.(); }}
            className={`
              relative flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-left
              transition-all duration-150 ease-out group
              ${isActive
                ? "bg-[oklch(0.19_0.005_250)] text-gold"
                : "text-muted-foreground hover:bg-[oklch(0.16_0.005_250)] hover:text-foreground"
              }
              ${!showLabels ? "justify-center" : ""}
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
            <div className="relative flex-shrink-0">
              <Icon className={`w-4.5 h-4.5 ${showLabels ? "ml-1" : ""}`} />
              {!showLabels && !!item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold text-[9px] font-bold text-[oklch(0.13_0.005_250)] flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </div>
            {showLabels && (
              <span className="text-sm font-medium truncate flex-1">{item.label}</span>
            )}
            {showLabels && !!item.badge && item.badge > 0 && (
              <span className="text-[10px] font-semibold text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  /** Renders visit-site link + user panel */
  const renderFooter = (showLabels: boolean, onNavigate?: () => void) => (
    <>
      {currentSite?.domain && showLabels && (
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
      <div className="border-t border-border p-3">
        {showLabels && (
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
              onClick={() => { signOut(); onNavigate?.(); }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Mobile Sheet Sidebar ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-[oklch(0.13_0.005_250)] border-border flex flex-col"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-border gap-3">
            <div className="w-7 h-7 rounded bg-gold flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-[oklch(0.13_0.005_250)]">E</span>
            </div>
            <span className="font-heading font-bold text-sm text-gold tracking-wide truncate">
              ETERNO
            </span>
          </div>

          {/* Current Site */}
          <div className="px-3 py-3 border-b border-border">
            <div className="px-3 py-2 rounded-md bg-[oklch(0.16_0.005_250)]">
              <p className="text-xs text-muted-foreground truncate">Current Site</p>
              <p className="text-sm font-medium text-foreground truncate">
                {loading ? "Loading..." : currentSite?.name || "No site connected"}
              </p>
            </div>
          </div>

          {renderNav(true, () => setMobileOpen(false))}
          {renderFooter(true, () => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`
          hidden md:flex fixed top-0 left-0 h-full z-40 flex-col
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

        {/* Current Site Info */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-border">
            <div className="px-3 py-2 rounded-md bg-[oklch(0.16_0.005_250)]">
              <p className="text-xs text-muted-foreground truncate">Current Site</p>
              <p className="text-sm font-medium text-foreground truncate">
                {loading ? "Loading..." : currentSite?.name || "No site connected"}
              </p>
            </div>
          </div>
        )}

        {renderNav(!collapsed)}
        {renderFooter(!collapsed)}

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
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
          ml-0 ${collapsed ? "md:ml-16" : "md:ml-56"}
        `}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 md:px-6 bg-[oklch(0.13_0.005_250)]/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-[oklch(0.16_0.005_250)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-bold text-base text-foreground">
              {NAV_ITEMS.find((n) => n.path === location || (n.path !== "/" && location.startsWith(n.path)))?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {currentSite && (
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                {currentSite.slug}
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${currentSite ? "bg-emerald-500" : "bg-yellow-500"}`} title={currentSite ? "Site live" : "No site"} />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
