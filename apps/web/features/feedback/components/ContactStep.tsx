"use client";

import { Form, Input, Radio, Typography } from "antd";
import type { CustomerType, FeedbackFormValues } from "../types";
import { PHONE_PATTERN } from "../validation";

interface ContactStepProps {
  isDark?: boolean;
}

const CUSTOMER_OPTIONS: { label: string; value: CustomerType }[] = [
  { label: "Homeowner", value: "homeowner" },
  { label: "Painter", value: "painter" },
];

export function ContactStep({ isDark = false }: ContactStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <Typography.Title
          level={3}
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 650,
            letterSpacing: "-0.02em",
            color: isDark ? "#EDEAE3" : "#1C1E21",
          }}
        >
          Your details
        </Typography.Title>
        <Typography.Paragraph
          style={{
            margin: "6px 0 0 0",
            fontSize: 14,
            color: isDark ? "#8A92A0" : "#636B78",
            lineHeight: 1.5,
          }}
        >
          We will only use this if we need to follow up directly on your feedback.
        </Typography.Paragraph>
      </div>

      <Form.Item<FeedbackFormValues>
        name="customer_type"
        label={
          <span style={{ fontWeight: 600, color: isDark ? "#EDEAE3" : "#1C1E21" }}>
            I am a
          </span>
        }
        style={{ marginBottom: 12 }}
      >
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          options={CUSTOMER_OPTIONS}
          style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        />
      </Form.Item>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
        <Form.Item<FeedbackFormValues>
          name="name"
          label={
            <span style={{ fontWeight: 600, color: isDark ? "#EDEAE3" : "#1C1E21" }}>
              Full name
            </span>
          }
          rules={[{ required: true, whitespace: true, message: "Please enter your name" }]}
          style={{ marginBottom: 16 }}
        >
          <Input
            autoComplete="name"
            maxLength={120}
            placeholder="e.g. Amina Otieno"
            style={{
              borderRadius: 12,
              padding: "10px 14px",
              backgroundColor: isDark ? "#14161A" : "#FFFFFF",
              borderColor: isDark ? "#2E323B" : "#E5DFD5",
            }}
          />
        </Form.Item>

        <Form.Item<FeedbackFormValues>
          name="email"
          label={
            <span style={{ fontWeight: 600, color: isDark ? "#EDEAE3" : "#1C1E21" }}>
              Email
            </span>
          }
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Enter a valid email address" },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="amina@example.com"
            style={{
              borderRadius: 12,
              padding: "10px 14px",
              backgroundColor: isDark ? "#14161A" : "#FFFFFF",
              borderColor: isDark ? "#2E323B" : "#E5DFD5",
            }}
          />
        </Form.Item>

        <Form.Item<FeedbackFormValues>
          name="phone"
          label={
            <span style={{ fontWeight: 600, color: isDark ? "#EDEAE3" : "#1C1E21" }}>
              Phone number
            </span>
          }
          rules={[
            { required: true, message: "Please enter your phone number" },
            {
              pattern: PHONE_PATTERN,
              message: "Enter a valid phone number, e.g. +254 700 111 222",
            },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="+254 700 111 222"
            style={{
              borderRadius: 12,
              padding: "10px 14px",
              backgroundColor: isDark ? "#14161A" : "#FFFFFF",
              borderColor: isDark ? "#2E323B" : "#E5DFD5",
            }}
          />
        </Form.Item>
      </div>

      <Form.Item<FeedbackFormValues>
        name="comment"
        label={
          <span style={{ fontWeight: 600, color: isDark ? "#EDEAE3" : "#1C1E21" }}>
            Anything else to add? (optional)
          </span>
        }
        style={{ marginBottom: 4 }}
      >
        <Input.TextArea
          rows={3}
          maxLength={1000}
          showCount
          placeholder="Anything else you'd like us to know about how the color, coverage, or finish turned out?"
          style={{
            borderRadius: 12,
            padding: "12px 14px",
            backgroundColor: isDark ? "#14161A" : "#FFFFFF",
            borderColor: isDark ? "#2E323B" : "#E5DFD5",
            lineHeight: 1.6,
          }}
        />
      </Form.Item>
    </div>
  );
}
