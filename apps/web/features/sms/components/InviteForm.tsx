"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Flex, Form, Input, Tag, Typography } from "antd";
import { errorDetail, firstFieldError } from "../../../lib/http";
import { sendInvites } from "../api";
import { parsePhoneList } from "../phones";
import { useSmsConfig } from "../queries";
import type { InviteOutcome } from "../types";

interface InviteValues {
  phones: string;
}

const STATUS_COLOR: Record<InviteOutcome["status"], string> = {
  sent: "success",
  failed: "error",
  skipped: "default",
};

export function InviteForm() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<InviteValues>();
  const { data: config } = useSmsConfig();
  const invite = useMutation({
    mutationFn: (phones: string[]) => sendInvites(phones),
    onSuccess: () => {
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["sms", "log"] });
    },
  });

  const errorMessage = invite.error
    ? (firstFieldError(invite.error) ?? errorDetail(invite.error, "Could not send the invites."))
    : null;

  return (
    <Card title="Send SMS invites" extra={config && <Tag>{config.environment}</Tag>}>
      <Flex vertical gap="middle">
        {config && !config.enabled && (
          <Alert
            type="warning"
            showIcon
            message="SMS gateway is not configured. Invites are logged as skipped and nothing is sent."
          />
        )}
        {config && (
          <Flex vertical>
            <Typography.Text type="secondary">Message ({config.invite_text.length}/160)</Typography.Text>
            <Typography.Text>{config.invite_text}</Typography.Text>
          </Flex>
        )}
        <Form<InviteValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={({ phones }) => invite.mutate(parsePhoneList(phones))}
        >
          <Form.Item<InviteValues>
            name="phones"
            label="Phone numbers"
            extra="One per line, or separated by commas. Up to 50."
            rules={[
              { required: true, message: "Enter at least one phone number" },
              {
                validator: (_, value: string | undefined) =>
                  parsePhoneList(value ?? "").length <= 50
                    ? Promise.resolve()
                    : Promise.reject(new Error("Send to at most 50 numbers at a time")),
              },
            ]}
          >
            <Input.TextArea rows={4} placeholder={"0700 111 222\n+254 711 222 333"} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={invite.isPending}>
            Send invites
          </Button>
        </Form>
        {errorMessage && <Alert type="error" showIcon message={errorMessage} />}
        {invite.data && (
          <Flex vertical gap={4}>
            <Alert
              type={invite.data.failed > 0 ? "warning" : "success"}
              showIcon
              message={`${invite.data.sent} sent, ${invite.data.failed} failed, ${invite.data.skipped} skipped`}
            />
            {invite.data.results.map((result) => (
              <Flex key={result.phone} justify="space-between" align="center">
                <Typography.Text>{result.phone}</Typography.Text>
                <Flex gap="small" align="center">
                  {result.error && <Typography.Text type="secondary">{result.error}</Typography.Text>}
                  <Tag color={STATUS_COLOR[result.status]}>{result.status}</Tag>
                </Flex>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
