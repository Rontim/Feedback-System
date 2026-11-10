
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}
