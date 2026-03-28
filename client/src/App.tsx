import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, RequireAuth } from "./contexts/AuthContext";
import { SiteProvider } from "./contexts/SiteContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import SectionEditor from "./pages/SectionEditor";
import Store from "./pages/Store";
import Themes from "./pages/Themes";
import Languages from "./pages/Languages";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/sections" component={SectionEditor} />
      <Route path="/store" component={Store} />
      <Route path="/themes" component={Themes} />
      <Route path="/i18n" component={Languages} />
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
            <RequireAuth>
              <SiteProvider>
                <DashboardLayout>
                  <Router />
                </DashboardLayout>
              </SiteProvider>
            </RequireAuth>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
