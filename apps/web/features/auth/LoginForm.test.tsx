// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/http";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const login = vi.fn();
vi.mock("./api", () => ({ login: (values: unknown) => login(values) }));

import { LoginForm } from "./LoginForm";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
  return client;
}

describe("LoginForm", () => {
  it("requires both fields", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your username")).toBeTruthy();
    expect(screen.getByText("Enter your password")).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in, caches the user and goes to the dashboard", async () => {
    const rep = { id: 1, username: "grace", name: "Grace", email: "g@x.com" };
    login.mockResolvedValue(rep);
    const user = userEvent.setup();
    const client = renderForm();

    await user.type(screen.getByLabelText("Username"), "grace");
    await user.type(screen.getByLabelText("Password"), "pw-12345");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(login).toHaveBeenCalledWith({ username: "grace", password: "pw-12345" });
    expect(client.getQueryData(["me"])).toEqual(rep);
  });

  it("shows the server's message when sign-in fails", async () => {
    login.mockRejectedValue(new ApiError(400, { detail: "Invalid username or password." }));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Username"), "grace");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid username or password.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
