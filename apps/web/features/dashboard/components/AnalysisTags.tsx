"use client";

import { Flex, Tag } from "antd";
import { SENTIMENT_LABEL, SENTIMENT_TAG_COLOR, TOPIC_LABEL } from "../format";
import type { Analysis } from "../types";

/** Mood and topic chips for a comment. Renders nothing when the comment was not analysed. */
export function AnalysisTags({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  return (
    <Flex gap={4} wrap>
      <Tag color={SENTIMENT_TAG_COLOR[analysis.sentiment]}>{SENTIMENT_LABEL[analysis.sentiment]}</Tag>
      <Tag>{TOPIC_LABEL[analysis.topic]}</Tag>
    </Flex>
  );
}
