"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { useState, type ReactNode } from "react";
import { baseTheme } from "./theme";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={baseTheme}>{children}</ConfigProvider>
    </QueryClientProvider>
  );
}
