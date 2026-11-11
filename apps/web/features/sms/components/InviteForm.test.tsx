// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/http";
import type { InviteResult, SmsConfigDto } from "../types";

const getSmsConfig = vi.fn();
const sendInvites = vi.fn();
vi.mock("../api", () => ({
  getSmsConfig: () => getSmsConfig(),
  getSmsLog: vi.fn(),
  sendInvites: (phones: string[]) => sendInvites(phones),
}));

import { InviteForm } from "./InviteForm";

const CONFIG: SmsConfigDto = {
  enabled: true,
  environment: "sandbox",
  sender_id: "CompanyX",
  invite_text: "Thanks for buying our paint! Reply e.g. 4 5 4",
};

beforeEach(() => getSmsConfig.mockResolvedValue(CONFIG));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InviteForm />
    </QueryClientProvider>,
  );
}

describe("InviteForm", () => {
  it("shows the exact message that will be sent and the environment", async () => {
    renderForm();
    expect(await screen.findByText(CONFIG.invite_text)).toBeTruthy();
    expect(screen.getByText("sandbox")).toBeTruthy();
  });

  it("warns when the gateway is not configured", async () => {
    getSmsConfig.mockResolvedValue({ ...CONFIG, enabled: false });
    renderForm();
    expect(await screen.findByText(/SMS gateway is not configured/)).toBeTruthy();
  });

  it("requires at least one number", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Send invites" }));
    expect(await screen.findByText("Enter at least one phone number")).toBeTruthy();
    expect(sendInvites).not.toHaveBeenCalled();
  });

  it("sends the parsed numbers and shows a result per number", async () => {
    const result: InviteResult = {
      sent: 1,
      failed: 1,
      skipped: 0,
      results: [
        { phone: "+254700111222", status: "sent", error: "" },
        { phone: "+254700000000", status: "failed", error: "InvalidPhoneNumber (403)" },
      ],
    };
    sendInvites.mockResolvedValue(result);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Phone numbers"), "0700 111 222, 0700000000");
    await user.click(screen.getByRole("button", { name: "Send invites" }));

    expect(await screen.findByText("1 sent, 1 failed, 0 skipped")).toBeTruthy();
    expect(sendInvites).toHaveBeenCalledWith(["0700 111 222", "0700000000"]);
    expect(screen.getByText("InvalidPhoneNumber (403)")).toBeTruthy();
    expect(screen.getByText("+254700111222")).toBeTruthy();
  });

  it("shows the server's validation message", async () => {
    sendInvites.mockRejectedValue(new ApiError(400, { phones: ["Not valid phone numbers: 12"] }));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Phone numbers"), "12");
    await user.click(screen.getByRole("button", { name: "Send invites" }));

    expect(await screen.findByText("Not valid phone numbers: 12")).toBeTruthy();
  });
});
