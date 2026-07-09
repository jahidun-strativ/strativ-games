export function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

export function opt(fd: FormData, key: string): string | null {
  const value = fd.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export function int(fd: FormData, key: string): number {
  const value = Number.parseInt(str(fd, key), 10);
  if (Number.isNaN(value)) throw new Error(`Invalid number for field: ${key}`);
  return value;
}

export function optInt(fd: FormData, key: string): number | null {
  const raw = opt(fd, key);
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}
