import { createFileRoute } from "@tanstack/react-router";
import { FuturePage } from "@/components/app/FuturePage";

export const Route = createFileRoute("/_app/orcamentos")({
  component: () => <FuturePage title="Orçamentos" />,
});
