import type { WsCard } from "./queries";

export type { WsCard };

export function cardLabel(card: WsCard): string {
  const name = card.nickname ?? `Credit Card ${card.cardNumber || ""}`.trim();
  return card.balance
    ? `${name} — $${Number(card.balance).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : name;
}
