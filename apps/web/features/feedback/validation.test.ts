import { describe, expect, it } from "vitest";
import { isValidPhone } from "./validation";

describe("isValidPhone", () => {
  it.each(["+254700111222", "0700 111 222", "(020) 555-0100"])("accepts %s", (value) => {
    expect(isValidPhone(value)).toBe(true);
  });
  it.each(["", "12345", "abc1234567", "+254-700-111-222-333-444-555"])("rejects %s", (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});
