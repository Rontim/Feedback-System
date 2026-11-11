import { ApiError, http } from "../../lib/http";
import type { CareRep, LoginValues } from "./types";

/** The signed-in care rep, or null when there is no session. */
export async function fetchMe(): Promise<CareRep | null> {
  try {
    return await http<CareRep>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export async function login(values: LoginValues): Promise<CareRep> {
  await http("/api/auth/csrf"); // make sure the CSRF cookie exists before the POST
  return http<CareRep>("/api/auth/login", { method: "POST", body: values });
}

export async function logout(): Promise<void> {
  await http<null>("/api/auth/logout", { method: "POST" });
}
