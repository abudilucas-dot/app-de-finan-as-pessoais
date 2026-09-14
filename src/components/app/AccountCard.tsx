import { Archive, Pencil } from "lucide-react";

import { MoneyDisplay } from "@/components/app/MoneyDisplay";
import { Button } from "@/components/ui/button";
import type { Account } from "@/hooks/useAccounts";
import { accountTypeIcon, accountTypeLabel } from "@/lib/accounts";

export function AccountCard({
  account,
  currentBalance,
  onEdit,
  onArchive,
}: {
  account: Account;
  currentBalance?: number;
  onEdit?: (account: Account) => void;
  onArchive?: (account: Account) => void;
}) {
  const Icon = accountTypeIcon(account.type);

  return (
    <article className="surface flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
          style={{ backgroundColor: account.color ?? undefined }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{account.name}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {accountTypeLabel(account.type)}
            {account.institution ? ` · ${account.institution}` : ""}
          </p>
        </div>
        {account.is_archived ? (
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            Arquivada
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {currentBalance === undefined ? "Saldo inicial" : "Saldo atual"}
        </p>
        <MoneyDisplay
          value={currentBalance ?? account.initial_balance}
          className="text-xl font-semibold"
        />
      </div>

      {(onEdit || onArchive) && !account.is_archived ? (
        <div className="flex gap-2 border-t pt-3">
          {onEdit ? (
            <Button variant="ghost" size="sm" onClick={() => onEdit(account)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
          ) : null}
          {onArchive ? (
            <Button variant="ghost" size="sm" onClick={() => onArchive(account)}>
              <Archive className="h-4 w-4" aria-hidden="true" />
              Arquivar
            </Button>
          ) : null}
        </div>
      ) : null}

      {account.is_archived && onArchive ? (
        <div className="border-t pt-3">
          <Button variant="ghost" size="sm" onClick={() => onArchive(account)}>
            Reativar conta
          </Button>
        </div>
      ) : null}
    </article>
  );
}
