"use client";

import { FrownOutlined, MehOutlined, SmileOutlined } from "@ant-design/icons";
import { Form, Rate, Typography } from "antd";
import type { ReactNode } from "react";
import { RATING_LABELS, type RatingQuestion } from "../questions";
import type { FeedbackFormValues } from "../types";

/** Rating faces: one semantic icon per scale position, 1 (frown) to 5 (smile). */
const FACES: readonly ReactNode[] = [
  <FrownOutlined key="1" />,
  <FrownOutlined key="2" />,
  <MehOutlined key="3" />,
  <SmileOutlined key="4" />,
  <SmileOutlined key="5" />,
];

interface RatingStepProps {
  question: RatingQuestion;
}

export function RatingStep({ question }: RatingStepProps) {
  const form = Form.useFormInstance<FeedbackFormValues>();
  const value = Form.useWatch(question.key, form);
  const caption = value ? RATING_LABELS[value - 1] : "Select a rating from 1 to 5";

  return (
    <Form.Item<FeedbackFormValues>
      name={question.key}
      label={question.prompt}
      rules={[{ required: true, message: "Please choose a rating" }]}
      extra={
        <Typography.Text type="secondary" aria-live="polite">
          {caption}
        </Typography.Text>
      }
    >
      <Rate count={5} allowClear={false} character={({ index = 0 }) => FACES[index]} />
    </Form.Item>
  );
}
