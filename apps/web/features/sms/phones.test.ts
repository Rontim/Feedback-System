import { describe, expect, it } from "vitest";
import { parsePhoneList } from "./phones";

describe("parsePhoneList", () => {
  it("splits on newlines, commas and semicolons and trims", () => {
    expect(parsePhoneList("0700 111 222\n +254711222333 ,0722333444;0733444555")).toEqual([
      "0700 111 222",
      "+254711222333",
      "0722333444",
      "0733444555",
    ]);
  });
  it("drops blanks and exact duplicates", () => {
    expect(parsePhoneList("\n0700111222\n\n0700111222,  ,")).toEqual(["0700111222"]);
  });
  it("returns an empty list for empty input", () => {
    expect(parsePhoneList("  \n ")).toEqual([]);
  });
});
