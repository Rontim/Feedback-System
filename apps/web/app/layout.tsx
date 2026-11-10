import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { ReactNode } from "react";
import { AppProviders } from "./providers";

export const metadata = { title: "Company X Feedback" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
