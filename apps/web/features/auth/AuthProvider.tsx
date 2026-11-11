"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button, Flex, Result, Spin } from "antd";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { fetchMe, logout as logoutRequest } from "./api";
import type { CareRep } from "./types";

export const ME_KEY = ["me"] as const;
export const LOGIN_PATH = "/dashboard/login";

interface AuthContextValue {
  user: CareRep;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthGuard>");
  return value;
}

/** Renders children only for a signed-in care rep; everyone else is sent to the login page. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, refetch } = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isPending && user === null) router.replace(LOGIN_PATH);
  }, [isPending, user, router]);

  if (isError) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "100dvh" }}>
        <Result
          status="warning"
          title="Can't reach the server"
          subTitle="Check your connection. If it keeps happening, tell the engineering team."
          extra={<Button type="primary" onClick={() => void refetch()}>Try again</Button>}
        />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "100dvh" }}>
        <Spin />
      </Flex>
    );
  }

  const logout = async (): Promise<void> => {
    await logoutRequest();
    queryClient.clear();
    router.replace(LOGIN_PATH);
  };

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
