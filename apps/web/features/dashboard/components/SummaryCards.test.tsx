// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SummaryDto } from "../types";
import { SummaryCards } from "./SummaryCards";

afterEach(cleanup);

/** Text of the whole statistic block: AntD splits "3.71" into integer and decimal spans. */
const statisticText = (title: string): string =>
  screen.getByText(title).closest(".ant-statistic")?.textContent ?? "";

const DATA: SummaryDto = {
  total: 200,
  categories: { detractor: 50, passive: 30, promoter: 120 },
  mean: 3.71,
  alerts: { open: 7, unread: 2 },
};

describe("SummaryCards", () => {
  it("shows the headline numbers and category shares", () => {
    render(<SummaryCards data={DATA} loading={false} />);
    expect(screen.getByText("Total respondents")).toBeTruthy();
    expect(statisticText("Total respondents")).toContain("200");
    expect(statisticText("Average score")).toContain("3.71");
    expect(statisticText("Open alerts")).toContain("7");
    expect(statisticText("Open alerts")).toContain("(2 unread)");
    expect(screen.getByText("25%")).toBeTruthy(); // 50 / 200 detractors
    expect(screen.getByText("60%")).toBeTruthy(); // 120 / 200 promoters
  });

  it("copes with an empty database", () => {
    render(
      <SummaryCards
        loading={false}
        data={{ total: 0, categories: { detractor: 0, passive: 0, promoter: 0 }, mean: null, alerts: { open: 0, unread: 0 } }}
      />,
    );
    expect(screen.getByText("–")).toBeTruthy();
    expect(screen.getAllByText("0%").length).toBe(3);
  });
});
