"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Flex, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorDetail } from "../../lib/http";
import { login } from "./api";
import { ME_KEY } from "./AuthProvider";
import type { LoginValues } from "./types";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async (values: LoginValues): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(values);
      queryClient.setQueryData(ME_KEY, user);
      router.replace("/dashboard");
    } catch (caught) {
      setError(errorDetail(caught, "Could not sign in. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ width: "100%", maxWidth: 380 }}>
      <Flex vertical gap="middle">
        <Flex vertical>
          <Typography.Text type="secondary">Company X</Typography.Text>
          <Typography.Title level={4}>Care team sign in</Typography.Title>
        </Flex>
        {error && <Alert type="error" showIcon message={error} />}
        <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={handleFinish}>
          <Form.Item<LoginValues>
            name="username"
            label="Username"
            rules={[{ required: true, message: "Enter your username" }]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item<LoginValues>
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter your password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Sign in
          </Button>
        </Form>
      </Flex>
    </Card>
  );
}
