import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppHeader } from "@/components/app/AppHeader";
import { AppSidebar } from "@/components/app/AppSidebar";
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

  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) setTheme(settings.theme);
  }, [settings?.theme, setTheme, theme]);

  if (authLoading || (user && profileLoading) || !user || !profile?.onboarding_completed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Preparando seu espaço financeiro..." />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
