const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const MINUTES_PER_DAY = 24 * 60;

type Local = { day: number; month: number; minutes: number };

const RULE =
  /^(?:(?<months>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?(?:,(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?)*)\s*:\s*)?(?:(?<days>(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+)?(?<times>off|closed|\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*)$/;

export function isOpenAt(
  raw: string | null | undefined,
  at: Date,
  timeZone: string,
): boolean {
  if (!raw) return true;
  return evaluateOpeningHours(raw, at, timeZone) ?? true;
}

export function evaluateOpeningHours(
  raw: string,
  at: Date,
  timeZone: string,
): boolean | null {
  const text = raw.trim();
  if (text === "24/7") return true;
  const local = localParts(at, timeZone);
  if (local.day < 0 || local.month < 0) return null;
  let open: boolean | null = false;
  for (const part of text.split(";")) {
    const rule = part.trim();
    if (!rule) continue;
    const m = RULE.exec(rule);
    if (!m?.groups) return null;
    const { months, days, times } = m.groups;
    if (months && !inRange(months, local.month, MONTHS)) continue;
    if (days) {
      const regular = days
        .split(",")
        .filter((d) => d !== "PH")
        .join(",");
      if (!regular || !inRange(regular, local.day, DAYS)) continue;
    }
    open =
      times === "off" || times === "closed"
        ? false
        : inTimes(times, local.minutes);
  }
  return open;
}

function localParts(at: Date, timeZone: string): Local {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday").slice(0, 2);
  return {
    day: DAYS.findIndex((d) => d === weekday),
    month: MONTHS.findIndex((m) => m === get("month").slice(0, 3)),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function inRange(
  list: string,
  index: number,
  names: readonly string[],
): boolean {
  return list.split(",").some((item) => {
    const [a, b] = item.split("-");
    const from = names.indexOf(a);
    if (from < 0) return false;
    if (!b) return from === index;
    const to = names.indexOf(b);
    return from <= to
      ? index >= from && index <= to
      : index >= from || index <= to;
  });
}

function inTimes(times: string, minutes: number): boolean {
  return times.split(",").some((range) => {
    const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(range);
    if (!m) return false;
    const start = Number(m[1]) * 60 + Number(m[2]);
    const end = Number(m[3]) * 60 + Number(m[4]);
    if (end === start) return false;
    return start < end
      ? minutes >= start && minutes < end
      : minutes >= start || minutes < end % MINUTES_PER_DAY;
  });
}
