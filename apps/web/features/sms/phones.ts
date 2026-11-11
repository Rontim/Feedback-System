/** Split pasted text (one per line, or separated by commas/semicolons) into unique entries. */
export function parsePhoneList(text: string): string[] {
  const entries = text
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return [...new Set(entries)];
}
