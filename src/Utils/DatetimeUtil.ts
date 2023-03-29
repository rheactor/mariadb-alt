const dateOffset = Math.abs(new Date().getTimezoneOffset() * 60000);

export const normalizeDate = (date: string) =>
  new Date(new Date(date).getTime() - dateOffset);

export const padDatetime = (value: number, length = 2) =>
  value.toString().padStart(length, "0");
