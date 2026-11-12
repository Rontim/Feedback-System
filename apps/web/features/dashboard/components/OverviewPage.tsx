"use client";

import { Col, Row } from "antd";
import { useSummary } from "../queries";
import { CategoryDonut } from "./CategoryDonut";
import { SummaryCards } from "./SummaryCards";
import { TopicsChart } from "./TopicsChart";
import { TrendChart } from "./TrendChart";

export function OverviewPage() {
  const { data, isLoading } = useSummary();
  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <SummaryCards data={data} loading={isLoading} />
      </Col>
      <Col xs={24} xl={9}>
        <CategoryDonut data={data} loading={isLoading} />
      </Col>
      <Col xs={24} xl={15}>
        <TrendChart />
      </Col>
      <Col span={24}>
        <TopicsChart />
      </Col>
    </Row>
  );
}
