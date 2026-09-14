import { createFileRoute } from "@tanstack/react-router";
import { FuturePage } from "@/components/app/FuturePage";

export const Route = createFileRoute("/_app/relatorios")({
  component: () => <FuturePage title="Relatórios" />,
});
