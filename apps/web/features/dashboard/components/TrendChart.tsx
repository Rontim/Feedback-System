"use client";

import { Alert, Card, Empty, Flex, Segmented, Tag, Typography, theme } from "antd";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "../format";
import { useTrend } from "../queries";
import { buildTrendChartData } from "../trendData";
import type { TrendDto } from "../types";

const RANGES = [7, 14, 30, 90] as const;
const STEADY_BAND = 0.005; // points per day; below this the trend is called steady

function describeTrend(trend: TrendDto) {
  if (trend.projection.status !== "ok") return null;
  const { slope_per_day: slope, line, horizon_days: horizon } = trend.projection;
  const end = line[line.length - 1];
  const direction = slope > STEADY_BAND ? "Improving" : slope < -STEADY_BAND ? "Declining" : "Steady";
  const color = direction === "Improving" ? "success" : direction === "Declining" ? "error" : "default";
  return { direction, color, slope, horizon, projected: end.mean };
}

export function TrendChart() {
  const { token } = theme.useToken();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useTrend(days);
  const rows = useMemo(() => (data ? buildTrendChartData(data) : []), [data]);
  const trend = data ? describeTrend(data) : null;
  const hasData = rows.some((row) => row.actual !== null);

  return (
    <Card
      title="Score trend"
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
      {!hasData ? (
        <Empty description="No responses in this period" />
      ) : (
        <Flex vertical gap="middle">
          <div role="img" aria-label={`Line chart of the daily average score over the last ${days} days`}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  minTickGap={28}
                  stroke={token.colorTextSecondary}
                />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke={token.colorTextSecondary} />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)}
                />
                <Legend />
                <ReferenceLine y={3} stroke={token.colorTextQuaternary} strokeDasharray="2 4" />
                <Line
                  name="Daily average"
                  dataKey="actual"
                  stroke={token.colorPrimary}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  name="Trend"
                  dataKey="fit"
                  stroke={token.colorTextTertiary}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  name="Projection"
                  dataKey="forecast"
                  stroke={token.colorPrimary}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {data?.projection.status === "insufficient_data" && (
            <Alert
              type="info"
              showIcon
              message={`Not enough data for a projection yet: ${data.projection.days_with_data} of ${data.projection.min_days} days with responses.`}
            />
          )}
          {trend && (
            <Flex gap="small" align="center" wrap>
              <Tag color={trend.color}>{trend.direction}</Tag>
              <Typography.Text type="secondary">
                {trend.slope >= 0 ? "+" : ""}
                {trend.slope.toFixed(3)} points per day. Projected score in {trend.horizon} days:{" "}
                {trend.projected.toFixed(2)}.
              </Typography.Text>
            </Flex>
          )}
        </Flex>
      )}
    </Card>
  );
}
