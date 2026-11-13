"use client";

import { Card, Flex, Segmented, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";
import { formatDateTime } from "../../dashboard/format";
import { useSmsLog } from "../queries";
import type { SmsDirection, SmsLogRow, SmsStatus } from "../types";

type DirectionFilter = "all" | SmsDirection;

const FILTERS: { label: string; value: DirectionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
];

const STATUS_COLOR: Record<SmsStatus, string> = {
  sent: "success",
  received: "success",
  failed: "error",
  invalid: "warning",
  limited: "warning",
  skipped: "default",
  help: "default",
};

export function SmsLogTable() {
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (direction !== "all") query.set("direction", direction);
  const { data, isLoading, isFetching } = useSmsLog(query.toString());

  const columns: TableColumnsType<SmsLogRow> = [
    {
      title: "Time",
      dataIndex: "created_at",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Type",
      key: "type",
      width: 90,
      render: (_, row) =>
        row.direction === "inbound" ? <Tag color="blue">inbound</Tag> : <Tag>{row.kind}</Tag>,
    },
    { title: "Phone", dataIndex: "phone", width: 125 },
    {
      title: "Message",
      dataIndex: "body",
      ellipsis: true,
      render: (value: string, row) => (
        <Flex vertical gap={2}>
          <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
          {row.error && (
            <Tooltip title={row.error} placement="topLeft">
              <Typography.Text
                type="danger"
                ellipsis
                style={{ fontSize: 12, cursor: "help", maxWidth: 280, display: "inline-block" }}
              >
                Failed: {row.error}
              </Typography.Text>
            </Tooltip>
          )}
        </Flex>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (value: SmsStatus) => <Tag color={STATUS_COLOR[value]}>{value}</Tag>,
    },
  ];

  return (
    <Card title="SMS log">
      <Flex vertical gap="middle">
        <Segmented<DirectionFilter>
          options={FILTERS}
          value={direction}
          onChange={(value) => {
            setDirection(value);
            setPage(1);
          }}
        />
        <Table<SmsLogRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data?.results}
          loading={isLoading || isFetching}
          scroll={{ x: 620 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} messages`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Flex>
    </Card>
  );
}
