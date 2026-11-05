const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const armenianWeekdays = ["Կիրակի", "Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ"];
const armenianMonths = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
const armenianMonthsShort = ["հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"];

export function formatMoney(value: string | number): string {
  return moneyFormatter.format(Number(value) || 0);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${armenianMonthsShort[date.getMonth()]} · ${hours}:${minutes}`;
}

export function formatLongDate(date: Date): string {
  return `${armenianWeekdays[date.getDay()]}, ${armenianMonths[date.getMonth()]} ${date.getDate()}`;
}

export function safePhone(value = ""): string {
  return value.replace(/[^+\d]/g, "");
}
