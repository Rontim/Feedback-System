// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResponseRow, TopicsDto } from "../types";

const getTopics = vi.fn();
vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  getTopics: (days: number) => getTopics(days),
}));

import { AnalysisTags } from "./AnalysisTags";
import { ResponseDrawer } from "./ResponseDrawer";
import { TopicsChart, topicChartRows } from "./TopicsChart";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROW: ResponseRow = {
  id: 7,
  created_at: "2026-11-11T08:00:00Z",
  customer: { id: 1, name: "Amina Otieno", email: "a@x.com", phone: "+254700111222", type: "painter" },
  q_product: 2,
  q_care: 3,
  q_happy: 2,
  mean: "2.33",
  category: "detractor",
  channel: "web",
  comment: "Delivery was late",
  alert: null,
  analysis: { sentiment: "negative", topic: "delivery" },
};

describe("AnalysisTags", () => {
  it("shows mood and topic", () => {
    render(<AnalysisTags analysis={{ sentiment: "negative", topic: "delivery" }} />);
    expect(screen.getByText("Negative")).toBeTruthy();
    expect(screen.getByText("Delivery")).toBeTruthy();
  });
  it("renders nothing without an analysis", () => {
    const { container } = render(<AnalysisTags analysis={null} />);
    expect(container.textContent).toBe("");
  });
});

describe("ResponseDrawer AI tags", () => {
  it("shows the tags next to the comment", () => {
    render(<ResponseDrawer response={ROW} onClose={() => undefined} />);
    expect(screen.getByText("AI tags")).toBeTruthy();
    expect(screen.getByText("Negative")).toBeTruthy();
  });
  it("says so when a comment was not analysed", () => {
    render(<ResponseDrawer response={{ ...ROW, analysis: null }} onClose={() => undefined} />);
    expect(screen.getByText("Not analysed")).toBeTruthy();
  });
  it("hides the AI row entirely when there is no comment", () => {
    render(
      <ResponseDrawer response={{ ...ROW, comment: "", analysis: null }} onClose={() => undefined} />,
    );
    expect(screen.queryByText("AI tags")).toBeNull();
  });
});

function renderChart() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TopicsChart />
    </QueryClientProvider>,
  );
}

const TOPICS: TopicsDto = { days: 30, enabled: true, tagged: 0, awaiting: 0, topics: [] };

describe("TopicsChart", () => {
  beforeEach(() => getTopics.mockResolvedValue(TOPICS));

  it("explains when AI tagging is switched off", async () => {
    getTopics.mockResolvedValue({ ...TOPICS, enabled: false });
    renderChart();
    expect(await screen.findByText(/AI comment tagging is off/)).toBeTruthy();
  });

  it("shows how many comments are waiting when AI is on but nothing is tagged yet", async () => {
    getTopics.mockResolvedValue({ ...TOPICS, awaiting: 3 });
    renderChart();
    expect(await screen.findByText("3 comments are waiting to be tagged")).toBeTruthy();
  });

  it("says when there is simply nothing to show", async () => {
    renderChart();
    expect(await screen.findByText("No tagged comments in this period")).toBeTruthy();
  });

  it("summarises tagged and waiting counts when there is data", async () => {
    getTopics.mockResolvedValue({
      ...TOPICS,
      tagged: 84,
      awaiting: 4,
      topics: [{ topic: "delivery", positive: 1, neutral: 0, negative: 3, total: 4 }],
    });
    renderChart();
    expect(await screen.findByText(/84 comments tagged by AI, 4 waiting/)).toBeTruthy();
  });

  it("labels chart rows with readable topic names", () => {
    const rows = topicChartRows({
      ...TOPICS,
      topics: [{ topic: "colour", positive: 0, neutral: 1, negative: 0, total: 1 }],
    });
    expect(rows[0].label).toBe("Colour");
  });
});
