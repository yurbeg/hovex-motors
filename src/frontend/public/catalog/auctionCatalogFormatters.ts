const unavailableLabel = "Հասանելի չէ";

export function formatAuctionMoney(value: number | null, currency: string | null): string {
  if (value === null || !Number.isFinite(value)) return unavailableLabel;
  const maximumFractionDigits = Number.isInteger(value) ? 0 : 2;
  const normalizedCurrency = currency?.trim().toUpperCase() || null;

  if (normalizedCurrency && /^[A-Z]{3}$/.test(normalizedCurrency)) {
    try {
      return new Intl.NumberFormat("hy-AM", {
        style: "currency",
        currency: normalizedCurrency,
        maximumFractionDigits,
      }).format(value);
    } catch {
      // Fall through to a currency-code presentation without assuming USD.
    }
  }

  const amount = new Intl.NumberFormat("hy-AM", { maximumFractionDigits }).format(value);
  return normalizedCurrency ? `${amount} ${normalizedCurrency}` : `${amount} · արժույթը նշված չէ`;
}

export function formatAuctionDate(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return unavailableLabel;
  return new Intl.DateTimeFormat("hy-AM", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatAuctionDateTime(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return unavailableLabel;
  return new Intl.DateTimeFormat("hy-AM", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function odometerUnitLabel(unit: string | null): string {
  const normalized = unit?.trim().toLowerCase();
  if (!normalized) return "";
  if (["mi", "mile", "miles"].includes(normalized)) return "մղոն";
  if (["km", "kilometer", "kilometers", "kilometre", "kilometres"].includes(normalized)) return "կմ";
  return unit!.trim();
}

export function formatAuctionOdometer(
  value: number | null,
  unit: string | null,
  status: string | null = null,
): string {
  if (value === null || !Number.isFinite(value)) return status?.trim() || unavailableLabel;
  const amount = new Intl.NumberFormat("hy-AM", { maximumFractionDigits: 1 }).format(value);
  const suffix = odometerUnitLabel(unit);
  return [amount, suffix, status?.trim()].filter(Boolean).join(" · ");
}

export function formatCharacteristicValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("hy-AM", { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "boolean") return value ? "Այո" : "Ոչ";
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatCharacteristicValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

export { unavailableLabel as AUCTION_VALUE_UNAVAILABLE };
