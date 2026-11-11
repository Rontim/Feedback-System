"use client";

import {
  DashboardOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, ConfigProvider, Dropdown, Flex, Grid, Layout, Menu, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { NotificationBell } from "./NotificationBell";

const NAV: { key: string; label: string; icon: ReactNode }[] = [
  { key: "/dashboard", label: "Overview", icon: <DashboardOutlined /> },
  { key: "/dashboard/responses", label: "Responses", icon: <UnorderedListOutlined /> },
  { key: "/dashboard/alerts", label: "Alerts", icon: <WarningOutlined /> },
];

function ShellLayout({ children }: { children: ReactNode }) {
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
    <Layout style={{ minHeight: "100dvh" }}>
      <Layout.Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={screens.lg === false ? 0 : 64}
        style={{ borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Flex align="center" style={{ height: 48, padding: `0 ${token.paddingMD}px` }}>
          <Typography.Text strong>{collapsed ? "X" : "Company X"}</Typography.Text>
        </Flex>
        <Menu
          mode="inline"
          selectedKeys={[current.key]}
          items={NAV}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: "none" }}
        />
      </Layout.Sider>
      <Layout>
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
            <NotificationBell />
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Button type="text">{user.name}</Button>
            </Dropdown>
          </Flex>
        </Layout.Header>
        <Layout.Content style={{ padding: token.paddingMD }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}

/** Dashboard is data-dense, so it runs on AntD's compact algorithm. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={{ algorithm: theme.compactAlgorithm }}>
      <ShellLayout>{children}</ShellLayout>
    </ConfigProvider>
  );
}
