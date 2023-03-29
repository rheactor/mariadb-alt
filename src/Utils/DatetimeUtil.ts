const dateOffset = Math.abs(new Date().getTimezoneOffset() * 60000);

export const normalizeDate = (date: string) =>
  new Date(new Date(date).getTime() - dateOffset);

const pad = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

export const toNativeDate = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number
): Date =>
  new globalThis.Date(
    `${year < 0 ? "-00" : ""}` +
      `${pad(Math.abs(year), 4)}-${pad(month)}-${pad(day)}T` +
      `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}Z`
  );
