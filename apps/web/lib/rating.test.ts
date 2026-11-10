import { describe, expect, it } from "vitest";
import { classify } from "./rating";

describe("classify", () => {
  it("matches the brief example", () => expect(classify(2, 3, 2)).toBe("detractor"));
  it("treats exactly 3.00 as passive", () => expect(classify(1, 4, 4)).toBe("passive"));
  it("treats above 3 as promoter", () => expect(classify(4, 3, 3)).toBe("promoter"));
});
