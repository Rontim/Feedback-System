"use client";

import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import { baseTheme } from "./theme";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={baseTheme}>{children}</ConfigProvider>;
}
