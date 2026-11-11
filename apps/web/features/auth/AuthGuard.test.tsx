// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/http";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const fetchMe = vi.fn();
vi.mock("./api", () => ({ fetchMe: () => fetchMe(), logout: vi.fn() }));

import { AuthGuard } from "./AuthProvider";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderGuard() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthGuard>
        <p>secret dashboard</p>
      </AuthGuard>
    </QueryClientProvider>,
  );
}

describe("AuthGuard", () => {
  it("renders children for a signed-in care rep", async () => {
    fetchMe.mockResolvedValue({ id: 1, username: "grace", name: "Grace", email: "g@x.com" });
    renderGuard();
    expect(await screen.findByText("secret dashboard")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the login page when there is no session", async () => {
    fetchMe.mockResolvedValue(null);
    renderGuard();
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/login"));
    expect(screen.queryByText("secret dashboard")).toBeNull();
  });

  it("explains a server outage instead of spinning forever, and can retry", async () => {
    fetchMe.mockRejectedValueOnce(new ApiError(500, null));
    const user = userEvent.setup();
    renderGuard();

    expect(await screen.findByText("Can't reach the server")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled(); // an outage is not a logout

    fetchMe.mockResolvedValue({ id: 1, username: "grace", name: "Grace", email: "g@x.com" });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("secret dashboard")).toBeTruthy();
  });
});
