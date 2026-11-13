"use client";

import {
  DashboardOutlined,
  LogoutOutlined,
  MessageOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, ConfigProvider, Dropdown, Flex, Grid, Layout, Menu, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getDashboardTheme } from "../../../app/theme";
import { useAuth } from "../../auth/AuthProvider";
import { NotificationBell } from "./NotificationBell";

const NAV: { key: string; label: string; icon: ReactNode }[] = [
  { key: "/dashboard", label: "Overview", icon: <DashboardOutlined /> },
  { key: "/dashboard/responses", label: "Responses", icon: <UnorderedListOutlined /> },
  { key: "/dashboard/alerts", label: "Alerts", icon: <WarningOutlined /> },
  { key: "/dashboard/sms", label: "SMS", icon: <MessageOutlined /> },
];

interface ShellLayoutProps {
  children: ReactNode;
  isDark: boolean;
  toggleDark: () => void;
}

function ShellLayout({ children, isDark, toggleDark }: ShellLayoutProps) {
  const { token } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);

  const current = NAV.find((item) => item.key === pathname) ?? NAV[0];
  const userMenu: MenuProps["items"] = [
    { key: "logout", label: "Sign out", icon: <LogoutOutlined />, onClick: () => void logout() },
  ];

  return (
    <Layout style={{ minHeight: "100dvh", background: token.colorBgLayout }}>
      <Layout.Sider
        theme={isDark ? "dark" : "light"}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={screens.lg === false ? 0 : 64}
        style={{
          background: token.colorBgContainer,
          borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex
          align="center"
          gap={10}
          style={{
            height: 52,
            padding: `0 ${token.paddingMD}px`,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {/* Sleek X brand mark matching feedback page branding */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50% 50% 40% 60% / 60% 40% 60% 40%",
              backgroundColor: isDark ? "#DE6B48" : "#C85A32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: 12,
              lineHeight: 1,
              flexShrink: 0,
              boxShadow: isDark
                ? "0 0 10px rgba(222, 107, 72, 0.4)"
                : "0 2px 6px rgba(200, 90, 50, 0.25)",
            }}
          >
            X
          </div>
          {!collapsed && (
            <Typography.Text strong style={{ fontSize: 14, letterSpacing: "0.02em" }}>
              Company X
            </Typography.Text>
          )}
        </Flex>
        <Menu
          mode="inline"
          selectedKeys={[current.key]}
          items={NAV}
          onClick={({ key }) => router.push(key)}
          style={{ background: "transparent", borderInlineEnd: "none", paddingTop: 8 }}
        />
      </Layout.Sider>
      <Layout style={{ background: token.colorBgLayout }}>
        <Layout.Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: `0 ${token.paddingMD}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Breadcrumb
            items={[
              { title: <Link href="/dashboard">Dashboard</Link> },
              { title: current.label },
            ]}
          />
          <Flex align="center" gap="small">
            {/* Theme Toggle Button in top-right header */}
            <Button
              type="text"
              onClick={toggleDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="tactile-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                padding: "4px 8px",
                color: token.colorTextSecondary,
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </Button>
            <NotificationBell />
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Button type="text">{user.name}</Button>
            </Dropdown>
          </Flex>
        </Layout.Header>
        <Layout.Content style={{ padding: token.paddingMD, background: token.colorBgLayout }}>
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

/** Dashboard is data-dense and runs on our bespoke warm palette with Light/Dark support. */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("companyx_theme");
      if (saved === "dark") {
        setIsDark(true);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (typeof window !== "undefined") {
      localStorage.setItem("companyx_theme", isDark ? "dark" : "light");
    }
  }, [isDark]);

  return (
    <ConfigProvider theme={getDashboardTheme(isDark)}>
      <ShellLayout isDark={isDark} toggleDark={() => setIsDark((prev) => !prev)}>
        {children}
      </ShellLayout>
    </ConfigProvider>
  );
}
