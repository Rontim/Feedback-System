// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RATING_QUESTIONS } from "../questions";
import { FeedbackQuestionnaire } from "./FeedbackQuestionnaire";

type User = ReturnType<typeof userEvent.setup>;

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function answerRatings(user: User, ratings: number[]): Promise<void> {
  for (const [i, rating] of ratings.entries()) {
    await user.click(screen.getAllByRole("radio")[rating - 1]);
    await user.click(screen.getByRole("button", { name: "Next" }));
    const nextPrompt = RATING_QUESTIONS[i + 1]?.prompt ?? "Full name";
    await screen.findByText(nextPrompt);
  }
}

async function fillContact(user: User): Promise<void> {
  await user.type(screen.getByLabelText("Full name"), "Amina Otieno");
  await user.type(screen.getByLabelText("Email"), "amina@example.com");
  await user.type(screen.getByLabelText("Phone number"), "+254700111222");
}

describe("FeedbackQuestionnaire", () => {
  it("does not advance until a rating is chosen", async () => {
    const user = userEvent.setup();
    render(<FeedbackQuestionnaire />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Please choose a rating")).toBeTruthy();
    expect(screen.getByText(RATING_QUESTIONS[0].prompt)).toBeTruthy();
  });

  it("walks all steps, submits the scores and shows the thank-you result", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(fakeResponse(201, { id: 1, mean: "2.33", category: "detractor" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<FeedbackQuestionnaire />);

    await answerRatings(user, [2, 3, 2]);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(await screen.findByText("Thank you for your feedback")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body: unknown = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      q_product: 2,
      q_care: 3,
      q_happy: 2,
      name: "Amina Otieno",
      phone: "+254700111222",
      customer_type: "homeowner",
    });
  });

  it("shows server-side field errors and stays on the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fakeResponse(400, { phone: ["Server says no."] })),
    );
    const user = userEvent.setup();
    render(<FeedbackQuestionnaire />);

    await answerRatings(user, [4, 4, 4]);
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(await screen.findByText("Server says no.")).toBeTruthy();
    expect(screen.queryByText("Thank you for your feedback")).toBeNull();
  });
});
