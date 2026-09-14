import { CREDIT_CARD_COLORS } from "@/lib/creditCards";

export const DEBIT_CARD_COLORS = CREDIT_CARD_COLORS;

export type DebitCard = {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  institution: string | null;
  brand: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type DebitCardInput = Pick<
  DebitCard,
  "account_id" | "name" | "institution" | "brand" | "color"
>;
