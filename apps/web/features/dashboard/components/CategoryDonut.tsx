"use client";

import { Card, Empty, Flex, Tag, Typography, theme } from "antd";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Category } from "../../../lib/rating";
import { CATEGORY_LABEL, CATEGORY_TAG_COLOR } from "../format";
import type { SummaryDto } from "../types";

interface CategoryDonutProps {
  data: SummaryDto | undefined;
  loading: boolean;
}

const ORDER: readonly Category[] = ["detractor", "passive", "promoter"];

export function CategoryDonut({ data, loading }: CategoryDonutProps) {
  const { token } = theme.useToken();
  const fills: Record<Category, string> = {
    detractor: token.colorError,
    passive: token.colorWarning,
    promoter: token.colorSuccess,
  };
  const slices = ORDER.map((category) => ({
    category,
    name: CATEGORY_LABEL[category],
    value: data?.categories[category] ?? 0,
  }));
  const total = data?.total ?? 0;
  const summary = slices.map((s) => `${s.name}s: ${s.value}`).join(", ");

  return (
    <Card title="Detractors, passives, promoters" loading={loading}>
      {total === 0 ? (
        <Empty description="No responses yet" />
      ) : (
        <Flex vertical gap="middle">
          <div role="img" aria-label={`Donut chart. ${summary}`}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="90%"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.category} fill={fills[slice.category]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Flex vertical gap={4}>
            {slices.map((slice) => (
              <Flex key={slice.category} justify="space-between" align="center">
                <Tag color={CATEGORY_TAG_COLOR[slice.category]}>{slice.name}</Tag>
                <Typography.Text>
                  {slice.value}{" "}
                  <Typography.Text type="secondary">
                    ({Math.round((slice.value / total) * 100)}%)
                  </Typography.Text>
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
