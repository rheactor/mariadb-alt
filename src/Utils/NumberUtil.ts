export function toNumber(
  value: bigint | number | string,
): bigint | number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER
      ? Number(value)
      : value;
  }

  if (value.includes(".")) {
    return Number(value);
  }

  try {
    return toNumber(BigInt(value));
  } catch {
    return undefined;
  }
}
