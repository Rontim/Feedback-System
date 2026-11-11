"use client";

import { Card, Col, Row, Statistic, Tag, theme } from "antd";
import type { Category } from "../../../lib/rating";
import { CATEGORY_LABEL } from "../format";
import type { SummaryDto } from "../types";

interface SummaryCardsProps {
  data: SummaryDto | undefined;
  loading: boolean;
}

/** Cards in one row share the tallest height so the grid stays even. */
const CARD_FILL = { height: "100%" } as const;

const CATEGORY_ORDER: readonly Category[] = ["detractor", "passive", "promoter"];

function share(count: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((count / total) * 100)}%`;
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  const { token } = theme.useToken();
  const total = data?.total ?? 0;
  const categoryColor: Record<Category, string> = {
    detractor: token.colorError,
    passive: token.colorWarning,
    promoter: token.colorSuccess,
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card loading={loading} style={CARD_FILL}>
          <Statistic title="Total respondents" value={total} valueStyle={{ fontSize: 36 }} />
        </Card>
      </Col>
      <Col xs={12} md={8}>
        <Card loading={loading} style={CARD_FILL}>
          <Statistic
            title="Average score"
            value={data?.mean ?? "–"}
            precision={2}
            suffix={data?.mean == null ? undefined : "/ 5"}
          />
        </Card>
      </Col>
      <Col xs={12} md={8}>
        <Card loading={loading} style={CARD_FILL}>
          <Statistic
            title="Open alerts"
            value={data?.alerts.open ?? 0}
            suffix={`(${data?.alerts.unread ?? 0} unread)`}
          />
        </Card>
      </Col>
      {CATEGORY_ORDER.map((category) => (
        <Col xs={8} key={category}>
          <Card loading={loading} style={CARD_FILL}>
            <Statistic
              title={`${CATEGORY_LABEL[category]}s`}
              value={data?.categories[category] ?? 0}
              valueStyle={{ color: categoryColor[category], fontWeight: 600 }}
              suffix={
                <Tag
                  bordered={false}
                  style={{ marginLeft: 8, fontSize: 12, verticalAlign: 'middle' }}
                >
                  {share(data?.categories[category] ?? 0, total)}
                </Tag>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
