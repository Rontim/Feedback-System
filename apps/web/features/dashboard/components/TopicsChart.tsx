"use client";

import { Card, Empty, Flex, Segmented, Typography, theme } from "antd";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOPIC_LABEL } from "../format";
import { useTopics } from "../queries";
import type { TopicsDto } from "../types";

const RANGES = [7, 30, 90] as const;

export function topicChartRows(data: TopicsDto) {
  return data.topics.map((row) => ({ ...row, label: TOPIC_LABEL[row.topic] }));
}

function emptyMessage(data: TopicsDto): string {
  if (!data.enabled && data.tagged === 0) return "AI comment tagging is off (no API key configured)";
  if (data.awaiting > 0) return `${data.awaiting} comments are waiting to be tagged`;
  return "No tagged comments in this period";
}

export function TopicsChart() {
  const { token } = theme.useToken();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useTopics(days);
  const rows = useMemo(() => (data ? topicChartRows(data) : []), [data]);

  return (
    <Card
      title="What customers talk about"
      loading={isLoading}
      extra={
        <Segmented<number>
          size="small"
          options={RANGES.map((value) => ({ value, label: `${value}d` }))}
          value={days}
          onChange={setDays}
        />
      }
    >
      {!data || data.tagged === 0 ? (
        <Empty description={data ? emptyMessage(data) : "No data"} />
      ) : (
        <Flex vertical gap="small">
          <div role="img" aria-label="Stacked bar chart of AI-tagged comments by topic and mood">
            <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44 + 60)}>
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={token.colorBorderSecondary} horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke={token.colorTextSecondary} />
                <YAxis type="category" dataKey="label" width={72} stroke={token.colorTextSecondary} />
                <Tooltip />
                <Legend />
                <Bar dataKey="negative" name="Negative" stackId="mood" fill={token.colorError} isAnimationActive={false} />
                <Bar dataKey="neutral" name="Neutral" stackId="mood" fill={token.colorBorder} isAnimationActive={false} />
                <Bar dataKey="positive" name="Positive" stackId="mood" fill={token.colorSuccess} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Typography.Text type="secondary">
            {data.tagged} comments tagged by AI
            {data.awaiting > 0 ? `, ${data.awaiting} waiting` : ""}.
          </Typography.Text>
        </Flex>
      )}
    </Card>
  );
}
