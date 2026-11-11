"use client";

import { Flex } from "antd";
import { LoginForm } from "../../../features/auth/LoginForm";

export default function LoginPage() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <LoginForm />
    </Flex>
  );
}
