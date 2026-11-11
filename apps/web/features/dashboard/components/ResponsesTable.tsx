"use client";

import { Card, DatePicker, Flex, Input, Button, Table, Tag, Typography } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import type { SorterResult } from "antd/es/table/interface";
import { useState } from "react";
import type { Category } from "../../../lib/rating";
import { CATEGORY_LABEL, CATEGORY_TAG_COLOR, formatDateTime } from "../format";
import { useResponses } from "../queries";
import {
  DEFAULT_RESPONSES_PARAMS,
  buildResponsesQuery,
  type ResponseOrdering,
  type ResponsesParams,
} from "../queryParams";
import type { Channel, ResponseRow } from "../types";
import { ResponseDrawer } from "./ResponseDrawer";

const CATEGORY_FILTERS = (["detractor", "passive", "promoter"] as const).map((value) => ({
  text: CATEGORY_LABEL[value],
  value,
}));
const CHANNEL_FILTERS: { text: string; value: Channel }[] = [
  { text: "Web", value: "web" },
  { text: "SMS", value: "sms" },
];

const isCategory = (value: unknown): value is Category =>
  value === "detractor" || value === "passive" || value === "promoter";
const isChannel = (value: unknown): value is Channel => value === "web" || value === "sms";

function orderingFrom(sorter: SorterResult<ResponseRow>): ResponseOrdering {
  const { field, order } = sorter;
  if (!order || (field !== "created_at" && field !== "mean")) return "-created_at";
  return order === "ascend" ? field : `-${field}`;
}

function sortOrderFor(ordering: ResponseOrdering, field: "created_at" | "mean") {
  if (ordering === field) return "ascend" as const;
  if (ordering === `-${field}`) return "descend" as const;
  return null;
}

export function ResponsesTable() {
  const [params, setParams] = useState<ResponsesParams>(DEFAULT_RESPONSES_PARAMS);
  const [selected, setSelected] = useState<ResponseRow | null>(null);
  const { data, isLoading, isFetching } = useResponses(buildResponsesQuery(params));

  const columns: TableColumnsType<ResponseRow> = [
    {
      title: "Received",
      dataIndex: "created_at",
      width: 160,
      sorter: true,
      sortOrder: sortOrderFor(params.ordering, "created_at"),
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_, row) => (
        <Flex vertical>
          <Typography.Text>{row.customer.name || row.customer.phone}</Typography.Text>
          {row.customer.email && <Typography.Text type="secondary">{row.customer.email}</Typography.Text>}
        </Flex>
      ),
    },
    {
      title: "Type",
      key: "type",
      width: 100,
      render: (_, row) => <Tag color={row.customer.type === "painter" ? "blue" : "default"}>{row.customer.type}</Tag>,
    },
    {
      title: "Channel",
      dataIndex: "channel",
      width: 90,
      filters: CHANNEL_FILTERS,
      filteredValue: params.channels,
      render: (value: Channel) => value.toUpperCase(),
    },
    { title: "Product", dataIndex: "q_product", width: 80, align: "center" },
    { title: "Care", dataIndex: "q_care", width: 70, align: "center" },
    { title: "Happy", dataIndex: "q_happy", width: 70, align: "center" },
    {
      title: "Mean",
      dataIndex: "mean",
      width: 90,
      sorter: true,
      sortOrder: sortOrderFor(params.ordering, "mean"),
      render: (value: string, row) => <Tag color={CATEGORY_TAG_COLOR[row.category]}>{value}</Tag>,
    },
    {
      title: "Category",
      dataIndex: "category",
      width: 110,
      filters: CATEGORY_FILTERS,
      filteredValue: params.categories,
      render: (value: Category) => CATEGORY_LABEL[value],
    },
    {
      title: "Alert",
      key: "alert",
      width: 90,
      render: (_, row) =>
        row.alert ? (
          <Tag color={row.alert.handled_at ? "success" : "warning"}>
            {row.alert.handled_at ? "Handled" : "Open"}
          </Tag>
        ) : null,
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => setSelected(row)}>
          Details
        </Button>
      ),
    },
  ];

  const handleChange: TableProps<ResponseRow>["onChange"] = (pagination, filters, sorter) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    setParams((previous) => ({
      ...previous,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? previous.pageSize,
      categories: (filters.category ?? []).filter(isCategory),
      channels: (filters.channel ?? []).filter(isChannel),
      ordering: orderingFrom(sort),
    }));
  };

  const handleRange: RangePickerProps["onChange"] = (dates) =>
    setParams((previous) => ({
      ...previous,
      page: 1,
      from: dates?.[0]?.format("YYYY-MM-DD") ?? null,
      to: dates?.[1]?.format("YYYY-MM-DD") ?? null,
    }));

  return (
    <Card>
      <Flex vertical gap="middle">
        <Flex gap="small" wrap>
          <Input.Search
            allowClear
            placeholder="Search name, email or phone"
            style={{ maxWidth: 320 }}
            onSearch={(search) => setParams((previous) => ({ ...previous, page: 1, search }))}
          />
          <DatePicker.RangePicker onChange={handleRange} />
        </Flex>
        <Table<ResponseRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data?.results}
          loading={isLoading || isFetching}
          scroll={{ x: 1000 }}
          onChange={handleChange}
          pagination={{
            current: params.page,
            pageSize: params.pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} responses`,
          }}
        />
      </Flex>
      <ResponseDrawer response={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}
