/*
  DESIGN: Dark Forge — Public Onboarding Wizard
  Renders the BuildWizard outside the auth wall so visitors can commit to
  building a site before signing up (Wix/Squarespace pattern).

  Flow:
    1. Visitor clicks "Get Started" on eternowebstudio.com → /start
    2. Walks through wizard steps 1-4 (identity → theme → layout → review)
    3. Clicks "Build My Site" → state persisted to localStorage
    4. Redirects to / (auth wall) → Clerk sign-up appears
    5. After signup, Overview detects pending draft + auto-submits setupSite

  Already-signed-in users hitting /start are bounced to / immediately.
*/
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import BuildWizard, { type SetupSiteInput } from "@/components/onboarding/BuildWizard";
import { Leaf } from "lucide-react";

export const PENDING_BUILD_KEY = "eterno:pending-build";

export default function Start() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  // If user is already signed in, send them to the dashboard. They can build
  // from inside the dashboard using the same wizard.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  // Hand-off: persist wizard input + redirect to auth wall.
  // Returning true tells BuildWizard its draft was consumed (it clears the draft).
  const handleSubmit = async (input: SetupSiteInput): Promise<boolean> => {
    try {
      localStorage.setItem(PENDING_BUILD_KEY, JSON.stringify(input));
    } catch {
      /* quota exceeded — proceed anyway */
    }
    // Send them to the dashboard root. RequireAuth will show SignUp.
    // After signup, Overview picks up the pending draft and kicks off the build.
    setLocation("/");
    return true;
  };

  // "Back to options" — send them to the marketing site rather than nowhere.
  const handleBack = () => {
    window.location.href = "https://eternowebstudio.com/";
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already signed in — effect above will redirect, render a loader in the meantime
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Minimal top bar — brand only, no auth UI */}
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-gold" />
            <span className="font-heading font-bold text-sm text-foreground">Eterno Web Studio</span>
          </div>
          <button
            onClick={() => setLocation("/")}
            className="text-xs text-muted-foreground hover:text-gold transition-colors"
          >
            Already have a site? Sign in
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-stretch">
        <BuildWizard setupSite={handleSubmit} error={null} onBack={handleBack} />
      </main>
    </div>
  );
}
