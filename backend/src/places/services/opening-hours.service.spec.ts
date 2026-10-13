import { OpeningHoursService } from "./opening-hours.service";

const hours = new OpeningHoursService();
const isOpenAt = hours.isOpenAt.bind(hours);
const evaluateOpeningHours = hours.evaluate.bind(hours);

const TZ = "Europe/Warsaw";
// 2026-10-12 is a Monday; 10:00 UTC is 12:00 in Warsaw (CEST)
const monday = (utcHour: number) => new Date(Date.UTC(2026, 9, 12, utcHour, 0));
const saturday = (utcHour: number) =>
  new Date(Date.UTC(2026, 9, 17, utcHour, 0));

describe("opening hours", () => {
  it("reads weekday ranges in the local time zone", () => {
    expect(isOpenAt("Mo-Fr 09:00-17:00", monday(10), TZ)).toBe(true);
    expect(isOpenAt("Mo-Fr 09:00-17:00", monday(16), TZ)).toBe(false);
    expect(isOpenAt("Mo-Fr 09:00-17:00", saturday(10), TZ)).toBe(false);
  });

  it("applies later rules over earlier ones and supports several ranges", () => {
    const raw = "Mo-Su 09:00-18:00; Sa off";
    expect(isOpenAt(raw, monday(10), TZ)).toBe(true);
    expect(isOpenAt(raw, saturday(10), TZ)).toBe(false);
    expect(isOpenAt("Mo 09:00-12:00,14:00-18:00", monday(11), TZ)).toBe(false);
  });

  it("handles 24/7, month ranges and times past midnight", () => {
    expect(isOpenAt("24/7", saturday(2), TZ)).toBe(true);
    expect(isOpenAt("Nov-Mar: Mo-Su 09:00-16:00", monday(10), TZ)).toBe(false);
    expect(isOpenAt("Apr-Oct: Mo-Su 09:00-18:00", monday(10), TZ)).toBe(true);
    expect(isOpenAt("Mo-Su 20:00-02:00", monday(22), TZ)).toBe(true);
  });

  it("treats missing or unreadable hours as open", () => {
    expect(isOpenAt(null, monday(10), TZ)).toBe(true);
    expect(isOpenAt("sunrise-sunset", monday(10), TZ)).toBe(true);
    expect(
      evaluateOpeningHours("Apr 01-Nov 11: 07:00-20:00", monday(10), TZ),
    ).toBeNull();
  });
});
