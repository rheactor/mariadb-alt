export const toNativeDate = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number,
): Date => {
  const date = new Date();

  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hours, minutes, seconds, ms / 1000);

  return date;
};
