import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { AppHeader } from "@/components/app/AppHeader";
import { AppSidebar } from "@/components/app/AppSidebar";
import { BillingAccessGate } from "@/components/app/BillingAccessGate";
import { MobileNavigation } from "@/components/app/MobileNavigation";
import { LoadingState } from "@/components/app/states";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/_app")({
  component: PrivateAppLayout,
});

function PrivateAppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const handledInitialOpenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: settings } = useSettings();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!profileLoading && !profile?.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [authLoading, navigate, profile?.onboarding_completed, profileLoading, user]);

  // Uma abertura nova do PWA deve começar no painel Início. Se o aplicativo
  // apenas ficou em segundo plano, este layout não é remontado e a tela atual
  // continua intacta, como em qualquer app.
  useEffect(() => {
    if (
      handledInitialOpenRef.current ||
      authLoading ||
      profileLoading ||
      !user ||
      !profile?.onboarding_completed
    ) {
      return;
    }

    handledInitialOpenRef.current = true;
    if (pathname !== "/dashboard") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, navigate, pathname, profile?.onboarding_completed, profileLoading, user]);

  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) setTheme(settings.theme);
  }, [settings?.theme, setTheme, theme]);

  // Mantém a leitura no mesmo ponto quando o PWA só fica em segundo plano.
  // A posição vive apenas em memória: se o Valune for fechado de verdade, ela
  // some e a próxima abertura continua indo para o Início.
  useEffect(() => {
    let scrollFrame = 0;
    const restoreTimers: number[] = [];

    const saveScrollPosition = () => {
      lastScrollYRef.current = window.scrollY;
    };
    const handleScroll = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(saveScrollPosition);
    };
    const restoreScrollPosition = () => {
      if (document.visibilityState !== "visible") return;
      const restore = () => window.scrollTo({ top: lastScrollYRef.current, left: 0, behavior: "instant" });
      window.requestAnimationFrame(restore);
      restoreTimers.push(window.setTimeout(restore, 120));
      restoreTimers.push(window.setTimeout(restore, 350));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") saveScrollPosition();
      else restoreScrollPosition();
    };

    saveScrollPosition();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (authLoading || (user && profileLoading) || !user || !profile?.onboarding_completed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Preparando seu espaço financeiro..." />
      </main>
    );
  }

  return (
    <BillingAccessGate>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="min-w-0 flex-1">
          <AppHeader />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
        <MobileNavigation />
      </div>
    </BillingAccessGate>
  );
}
