export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

type DateValue = Date | string | number;

type DateParts = { year: string; month: string; day: string; hour: string; minute: string };

function asDate(value: DateValue) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date;
}

function partsFor(value: DateValue): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

export function brazilDateTimeInputValue(value: DateValue = new Date()) {
  const parts = partsFor(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function brazilDateInputValue(value: DateValue = new Date()) {
  return brazilDateTimeInputValue(value).slice(0, 10);
}

export function brazilMonthInputValue(value: DateValue = new Date()) {
  return brazilDateTimeInputValue(value).slice(0, 7);
}

export function parseBrazilDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return new Date(NaN);
  const [, year, month, day, hour, minute, second = "00"] = match;
  const utcGuess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(localParts.find((part) => part.type === type)?.value || 0);
  const representedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(utcGuess - (representedAsUtc - utcGuess));
}

export function parseBrazilDate(value: string) {
  return parseBrazilDateTimeLocal(`${value}T00:00`);
}

export function startOfBrazilDay(value: string) {
  return parseBrazilDate(value);
}

export function endOfBrazilDay(value: string) {
  const start = parseBrazilDate(value);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function startOfBrazilMonth(value: string) {
  return parseBrazilDateTimeLocal(`${value}-01T00:00`);
}

export function endOfBrazilMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return new Date(NaN);
  const nextMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
  const nextValue = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  return startOfBrazilMonth(nextValue);
}export function shiftBrazilMonth(value: string, offset: number) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}