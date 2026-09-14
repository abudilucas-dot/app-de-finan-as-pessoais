import { createFileRoute } from "@tanstack/react-router";
import { FuturePage } from "@/components/app/FuturePage";

export const Route = createFileRoute("/_app/transacoes")({
  component: () => <FuturePage title="Transações" />,
});
