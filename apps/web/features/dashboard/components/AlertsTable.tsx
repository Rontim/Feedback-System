"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Flex, Segmented, Table, Tag, Typography, message } from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";
import { errorDetail } from "../../../lib/http";
import { patchAlert } from "../api";
import { CATEGORY_TAG_COLOR, formatDateTime } from "../format";
import { useAlerts } from "../queries";
import { buildAlertsQuery, type AlertFilter } from "../queryParams";
import type { AlertRow, DeliveryStatus } from "../types";

const FILTER_OPTIONS: { label: string; value: AlertFilter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Open", value: "open" },
  { label: "Handled", value: "handled" },
];

const DELIVERY_COLOR: Record<DeliveryStatus, string> = {
  sent: "success",
  failed: "error",
  pending: "processing",
  skipped: "default",
};

export function AlertsTable() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [filter, setFilter] = useState<AlertFilter>("open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, isFetching } = useAlerts(buildAlertsQuery(filter, page, pageSize));

  const toggleHandled = useMutation({
    mutationFn: ({ id, handled }: { id: number; handled: boolean }) => patchAlert(id, { handled }),
    onSuccess: (_alert, { handled }) => {
      messageApi.success(handled ? "Alert marked as handled" : "Alert reopened");
      for (const key of ["alerts", "summary", "notifications", "responses"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error) => messageApi.error(errorDetail(error, "Could not update the alert.")),
  });

  const columns: TableColumnsType<AlertRow> = [
    {
      title: "Received",
      dataIndex: "created_at",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Customer to contact",
      key: "customer",
      render: (_, row) => (
        <Flex vertical>
          <Typography.Text strong>{row.customer.name || row.customer.phone}</Typography.Text>
          {row.customer.email && (
            <Typography.Link href={`mailto:${row.customer.email}`}>{row.customer.email}</Typography.Link>
          )}
          <Typography.Text type="secondary">{row.customer.phone}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: "Mean",
      key: "mean",
      width: 90,
      render: (_, row) => <Tag color={CATEGORY_TAG_COLOR[row.response.category]}>{row.response.mean}</Tag>,
    },
    {
      title: "Comment",
      key: "comment",
      ellipsis: true,
      render: (_, row) => row.response.comment || <Typography.Text type="secondary">–</Typography.Text>,
    },
    {
      title: "Email",
      dataIndex: "email_status",
      width: 90,
      render: (value: DeliveryStatus) => <Tag color={DELIVERY_COLOR[value]}>{value}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, row) =>
        row.handled_at ? (
          <Tag color="success">Handled{row.handled_by ? ` by ${row.handled_by}` : ""}</Tag>
        ) : (
          <Tag color={row.read_at ? "warning" : "processing"}>{row.read_at ? "Open" : "Unread"}</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 130,
      render: (_, row) => {
        const handled = row.handled_at !== null;
        return (
          <Button
            size="small"
            type={handled ? "default" : "primary"}
            loading={toggleHandled.isPending && toggleHandled.variables?.id === row.id}
            onClick={() => toggleHandled.mutate({ id: row.id, handled: !handled })}
          >
            {handled ? "Reopen" : "Mark handled"}
          </Button>
        );
      },
    },
  ];

  return (
    <Card>
      {contextHolder}
      <Flex vertical gap="middle">
        <Segmented<AlertFilter>
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
        <Table<AlertRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data?.results}
          loading={isLoading || isFetching}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} alerts`,
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
