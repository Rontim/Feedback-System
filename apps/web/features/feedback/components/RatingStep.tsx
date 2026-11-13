"use client";

import { Form, Typography } from "antd";
import { RATING_LABELS, SWATCH_TIERS, type RatingQuestion } from "../questions";
import type { FeedbackFormValues } from "../types";
import { PaintSwatchRating } from "./PaintSwatchRating";

interface RatingStepProps {
  question: RatingQuestion;
  isDark?: boolean;
}

export function RatingStep({ question, isDark = false }: RatingStepProps) {
  const form = Form.useFormInstance<FeedbackFormValues>();
  const value = Form.useWatch(question.key, form);

  const activeTiers = question.tiers ?? SWATCH_TIERS;
  const selectedTier = value ? activeTiers[value - 1] : null;

  const caption = selectedTier
    ? `${selectedTier.label}: ${selectedTier.subtitle}`
    : value
      ? RATING_LABELS[value - 1]
      : "Select a rating from 1 to 5";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          {question.prompt}
        </Typography.Title>
        {question.subtitle && (
          <Typography.Paragraph
            style={{
              margin: "6px 0 0 0",
              fontSize: 14,
              color: isDark ? "#8A92A0" : "#636B78",
              lineHeight: 1.5,
            }}
          >
            {question.subtitle}
          </Typography.Paragraph>
        )}
      </div>

      <Form.Item<FeedbackFormValues>
        name={question.key}
        rules={[{ required: true, message: "Please choose a rating" }]}
        style={{ marginBottom: 4 }}
      >
        <PaintSwatchRating isDark={isDark} tiers={activeTiers} />
      </Form.Item>

      {/* Full-width status banner displaying the active rating cleanly */}
      <div
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          backgroundColor: isDark ? "#16181C" : "#F4F1EC",
          border: `1px solid ${isDark ? "#282C34" : "#E8E2D8"}`,
          transition: "all 0.25s ease",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: selectedTier
              ? isDark
                ? selectedTier.colorDark
                : selectedTier.colorLight
              : isDark
                ? "#4A505C"
                : "#B8B3A8",
            boxShadow: selectedTier
              ? `0 0 8px ${isDark ? selectedTier.colorDark : selectedTier.colorLight}`
              : "none",
            transition: "all 0.25s ease",
            flexShrink: 0,
          }}
        />
        <Typography.Text
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isDark ? "#A0A6B2" : "#5C6470",
          }}
        >
          {caption}
        </Typography.Text>
      </div>
    </div>
  );
}
