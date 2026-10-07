import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";

const RESUME_KEY = "valune:resume-context";
const RESUME_WINDOW_MS = 20 * 60 * 1000;

type ResumeContext = {
  pathname: string;
  scrollY: number;
  savedAt: number;
};

function readResumeContext(): ResumeContext | null {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;

    const context = JSON.parse(raw) as ResumeContext;
    if (
      typeof context.pathname !== "string" ||
      typeof context.scrollY !== "number" ||
      typeof context.savedAt !== "number" ||
      Date.now() - context.savedAt > RESUME_WINDOW_MS
    ) {
      window.localStorage.removeItem(RESUME_KEY);
      return null;
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * Mantém o contexto de leitura quando o iOS coloca o PWA em segundo plano.
 * Alguns iPhones descartam a página em memória ao alternar de app; nesse caso
 * restauramos a tela e a rolagem sem salvar nenhum dado financeiro localmente.
 */
export function AppResumeManager() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const restoredPathRef = useRef<string | null>(null);

  const saveContext = useCallback(() => {
    try {
      window.localStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ pathname, scrollY: window.scrollY, savedAt: Date.now() } satisfies ResumeContext),
      );
    } catch {
      // O app continua funcional se o navegador bloquear o armazenamento local.
    }
  }, [pathname]);

  useEffect(() => {
    let scrollFrame = 0;
    const handleScroll = () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(saveContext);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") saveContext();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", saveContext);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      // Salva a posição da tela anterior antes de uma troca de rota.
      saveContext();
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", saveContext);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [saveContext]);

  useEffect(() => {
    const context = readResumeContext();
    if (!context || restoredPathRef.current === pathname) return;

    // Caso o iOS tenha reiniciado o PWA, ele normalmente abre o start_url
    // (/dashboard). Retomamos a última tela recente em vez de mandar o usuário
    // de volta para o início.
    if (pathname === "/dashboard" && context.pathname.startsWith("/")) {
      restoredPathRef.current = context.pathname;
      void navigate({ to: context.pathname, replace: true });
      return;
    }

    if (context.pathname !== pathname) return;
    restoredPathRef.current = pathname;

    const restoreScroll = () => window.scrollTo({ top: context.scrollY, left: 0, behavior: "instant" });
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restoreScroll);
    });
    const secondAttempt = window.setTimeout(restoreScroll, 180);
    const finalAttempt = window.setTimeout(restoreScroll, 650);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(secondAttempt);
      window.clearTimeout(finalAttempt);
    };
  }, [navigate, pathname]);

  useEffect(() => {
    const restoreAfterResume = () => {
      if (document.visibilityState !== "visible") return;
      restoredPathRef.current = null;
      const context = readResumeContext();
      if (!context || context.pathname !== pathname) return;
      window.setTimeout(() => window.scrollTo({ top: context.scrollY, left: 0, behavior: "instant" }), 80);
    };

    document.addEventListener("visibilitychange", restoreAfterResume);
    window.addEventListener("pageshow", restoreAfterResume);
    return () => {
      document.removeEventListener("visibilitychange", restoreAfterResume);
      window.removeEventListener("pageshow", restoreAfterResume);
    };
  }, [pathname]);

  return null;
}
