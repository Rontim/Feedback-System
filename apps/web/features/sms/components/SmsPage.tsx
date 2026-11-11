"use client";

import { Col, Row } from "antd";
import { InviteForm } from "./InviteForm";
import { SmsLogTable } from "./SmsLogTable";

export function SmsPage() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={9}>
        <InviteForm />
      </Col>
      <Col xs={24} xl={15}>
        <SmsLogTable />
      </Col>
    </Row>
  );
}
