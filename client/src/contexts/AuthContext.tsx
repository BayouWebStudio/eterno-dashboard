/*
  DESIGN: Dark Forge — Auth Context
  Wraps Clerk provider and exposes auth helpers for Convex API calls.
*/
import { ClerkProvider, useAuth as useClerkAuth, useUser, SignIn, SignUp } from "@clerk/react";
import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
const CONVEX_HTTP_URL = import.meta.env.VITE_CONVEX_HTTP_URL || "";

interface AuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  userImage: string | null;
  getToken: () => Promise<string | null>;
  convexHttpUrl: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();

  const getToken = useCallback(async () => {
    try {
      // Try the "convex" JWT template first (has extra claims); fall back to
      // the default session token if the template isn't configured in Clerk.
      try {
        const token = await clerkGetToken({ template: "convex" });
        if (token) return token;
      } catch { /* template not configured — fall through */ }
      return await clerkGetToken();
    } catch {
      return null;
    }
  }, [clerkGetToken]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);

  const value: AuthContextValue = {
    isLoaded,
    isSignedIn: !!isSignedIn,
    userId: user?.id ?? null,
    userName: user?.fullName ?? user?.firstName ?? null,
    userImage: user?.imageUrl ?? null,
    getToken,
    convexHttpUrl: CONVEX_HTTP_URL,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!CLERK_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4 max-w-md p-8">
          <h2 className="text-xl font-heading font-bold text-gold">Configuration Required</h2>
          <p className="text-muted-foreground text-sm">
            Missing <code className="font-mono text-gold-dim">VITE_CLERK_PUBLISHABLE_KEY</code>. 
            Please set it in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      afterSignInUrl="/"
      afterSignUpUrl="/"
      appearance={{
        variables: clerkAppearance.variables,
        elements: clerkAppearance.elements,
      }}
    >
      <AuthInner>{children}</AuthInner>
    </ClerkProvider>
  );
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#C9A84C",
    colorBackground: "#141820",
    colorText: "#f5f0e8",
    colorTextSecondary: "#c8bfa8",
    colorInputBackground: "#1e222c",
    colorInputText: "#f5f0e8",
    colorNeutral: "#f5f0e8",
  },
  elements: {
    headerTitle: { color: "#f5f0e8" },
    headerSubtitle: { color: "#c8bfa8" },
    formFieldLabel: { color: "#c8bfa8" },
    formFieldInput: { color: "#f5f0e8", backgroundColor: "#1e222c", borderColor: "#2e3340" },
    footerActionText: { color: "#c8bfa8" },
    footerActionLink: { color: "#C9A84C" },
    identityPreviewText: { color: "#c8bfa8" },
    identityPreviewEditButton: { color: "#C9A84C" },
    formButtonPrimary: { backgroundColor: "#C9A84C", color: "#0f1218" },
    card: { backgroundColor: "#141820", borderColor: "#2e3340" },
    alternativeMethodsBlockButton: { color: "#c8bfa8", borderColor: "#2e3340" },
    dividerLine: { backgroundColor: "#2e3340" },
    dividerText: { color: "#7a7060" },
  },
};

function AuthScreen() {
  const getMode = () => window.location.hash.includes("sign-up") ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(getMode);

  useEffect(() => {
    const onHash = () => setMode(getMode());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const switchTo = (m: "signin" | "signup") => {
    window.location.hash = m === "signup" ? "/sign-up" : "/";
    setMode(m);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-gold mb-2">Eterno Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "signin" ? "Sign in to manage your website" : "Create your account"}
          </p>
        </div>
        {mode === "signin" ? (
          <SignIn routing="hash" signUpUrl="#/sign-up" afterSignInUrl="/" appearance={clerkAppearance} />
        ) : (
          <SignUp routing="hash" signInUrl="#/" afterSignUpUrl="/" appearance={clerkAppearance} />
        )}
        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button onClick={() => switchTo("signup")} className="text-gold hover:underline font-medium">Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button onClick={() => switchTo("signin")} className="text-gold hover:underline font-medium">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // Clear auth-related hashes once signed in so Clerk doesn't get stuck
  useEffect(() => {
    if (isSignedIn && window.location.hash.includes("sign")) {
      window.location.hash = "";
    }
  }, [isSignedIn]);

  // Safety: if Clerk hasn't loaded after 8 seconds, clear any stale hash
  // and allow the auth screen to render (prevents infinite spinner)
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => {
      // If still not loaded and hash contains a sign-up/sign-in callback,
      // clear the hash so Clerk can re-initialize cleanly
      if (window.location.hash.includes("sign")) {
        window.location.hash = "";
      }
      setLoadingTooLong(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
          {loadingTooLong && (
            <button
              onClick={() => { window.location.hash = ""; window.location.reload(); }}
              className="text-xs text-gold hover:underline mt-2"
            >
              Taking too long? Click to retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
