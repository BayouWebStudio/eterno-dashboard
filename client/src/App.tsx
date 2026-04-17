import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, RequireAuth } from "./contexts/AuthContext";
import { SiteProvider } from "./contexts/SiteContext";
import { NavigationGuardProvider } from "./contexts/NavigationGuardContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import VisualEditor from "./pages/VisualEditor";
import Store from "./pages/Store";
import Themes from "./pages/Themes";
import Languages from "./pages/Languages";
import Testimonials from "./pages/Testimonials";
import Billing from "./pages/Billing";
import Bookings from "./pages/Bookings";
import AIAgent from "./pages/AIAgent";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Start from "./pages/Start";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/sections" component={VisualEditor} />
      <Route path="/store" component={Store} />
      <Route path="/themes" component={Themes} />
      <Route path="/i18n" component={Languages} />
      <Route path="/testimonials" component={Testimonials} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/billing" component={Billing} />
      <Route path="/ai-agent" component={AIAgent} />
      <Route path="/clients" component={Clients} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.18 0.005 250)",
                border: "1px solid oklch(0.25 0.005 250)",
                color: "oklch(0.88 0.01 80)",
              },
            }}
          />
          <AuthProvider>
            <Switch>
              {/* Public onboarding wizard — no auth wall. Users commit to
                  building a site first, then sign up at the end (Wix/Squarespace). */}
              <Route path="/start" component={Start} />
              <Route>
                <RequireAuth>
                  <SiteProvider>
                    <NavigationGuardProvider>
                      <DashboardLayout>
                        <Router />
                      </DashboardLayout>
                    </NavigationGuardProvider>
                  </SiteProvider>
                </RequireAuth>
              </Route>
            </Switch>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
