"use client";

import { Form, Input, Radio } from "antd";
import { PHONE_PATTERN } from "../validation";
import type { CustomerType, FeedbackFormValues } from "../types";

const CUSTOMER_OPTIONS: { label: string; value: CustomerType }[] = [
  { label: "Homeowner", value: "homeowner" },
  { label: "Painter", value: "painter" },
];

export function ContactStep() {
  return (
    <>
      <Form.Item<FeedbackFormValues> name="customer_type" label="I am a">
        <Radio.Group optionType="button" buttonStyle="solid" options={CUSTOMER_OPTIONS} />
      </Form.Item>
      <Form.Item<FeedbackFormValues>
        name="name"
        label="Full name"
        rules={[{ required: true, whitespace: true, message: "Please enter your name" }]}
      >
        <Input autoComplete="name" maxLength={120} />
      </Form.Item>
      <Form.Item<FeedbackFormValues>
        name="email"
        label="Email"
        rules={[
          { required: true, message: "Please enter your email" },
          { type: "email", message: "Enter a valid email address" },
        ]}
      >
        <Input type="email" autoComplete="email" inputMode="email" />
      </Form.Item>
      <Form.Item<FeedbackFormValues>
        name="phone"
        label="Phone number"
        rules={[
          { required: true, message: "Please enter your phone number" },
          { pattern: PHONE_PATTERN, message: "Enter a valid phone number, e.g. +254 700 111 222" },
        ]}
      >
        <Input type="tel" autoComplete="tel" inputMode="tel" maxLength={20} />
      </Form.Item>
      <Form.Item<FeedbackFormValues> name="comment" label="Anything to add? (optional)">
        <Input.TextArea rows={3} maxLength={1000} showCount />
      </Form.Item>
    </>
  );
}
