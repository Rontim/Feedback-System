"use client";

import { Card, DatePicker, Flex, Input, Button, Table, Tag, Typography } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import type { SorterResult } from "antd/es/table/interface";
import { useState } from "react";
import type { Category } from "../../../lib/rating";
import {
  CATEGORY_LABEL,
  CATEGORY_TAG_COLOR,
  SENTIMENT_LABEL,
  SENTIMENT_TAG_COLOR,
  TOPIC_LABEL,
  formatDateTime,
} from "../format";
import { useResponses } from "../queries";
import {
  DEFAULT_RESPONSES_PARAMS,
  buildResponsesQuery,
  type ResponseOrdering,
  type ResponsesParams,
} from "../queryParams";
import type { Channel, ResponseRow, Sentiment, Topic } from "../types";
import { ResponseDrawer } from "./ResponseDrawer";

const CATEGORY_FILTERS = (["detractor", "passive", "promoter"] as const).map((value) => ({
  text: CATEGORY_LABEL[value],
  value,
}));
const CHANNEL_FILTERS: { text: string; value: Channel }[] = [
  { text: "Web", value: "web" },
  { text: "SMS", value: "sms" },
];

const SENTIMENT_FILTERS = (Object.keys(SENTIMENT_LABEL) as Sentiment[]).map((value) => ({
  text: SENTIMENT_LABEL[value],
  value,
}));
const TOPIC_FILTERS = (Object.keys(TOPIC_LABEL) as Topic[]).map((value) => ({
  text: TOPIC_LABEL[value],
  value,
}));

const hasOwn = (object: object, key: unknown): boolean =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);
const isSentiment = (value: unknown): value is Sentiment => hasOwn(SENTIMENT_LABEL, value);
const isTopic = (value: unknown): value is Topic => hasOwn(TOPIC_LABEL, value);
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
      width: 150,
      sorter: true,
      sortOrder: sortOrderFor(params.ordering, "created_at"),
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Customer",
      key: "customer",
      width: 250,
      render: (_, row) => (
        <Flex vertical>
          <Flex gap={6} align="center">
            <Typography.Text ellipsis>{row.customer.name || row.customer.phone}</Typography.Text>
            {row.customer.type === "painter" && <Tag color="blue">painter</Tag>}
          </Flex>
          {row.customer.email && (
            <Typography.Text type="secondary" ellipsis>
              {row.customer.email}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Channel",
      dataIndex: "channel",
      width: 90,
      filters: CHANNEL_FILTERS,
      filteredValue: params.channels,
      render: (value: Channel) => value.toUpperCase(),
    },
    { title: "Product", dataIndex: "q_product", width: 75, align: "center" },
    { title: "Care", dataIndex: "q_care", width: 60, align: "center" },
    { title: "Happy", dataIndex: "q_happy", width: 65, align: "center" },
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
      title: "Mood",
      key: "sentiment",
      width: 100,
      filters: SENTIMENT_FILTERS,
      filteredValue: params.sentiments,
      render: (_, row) =>
        row.analysis ? (
          <Tag color={SENTIMENT_TAG_COLOR[row.analysis.sentiment]}>
            {SENTIMENT_LABEL[row.analysis.sentiment]}
          </Tag>
        ) : null,
    },
    {
      title: "Topic",
      key: "topic",
      width: 100,
      filters: TOPIC_FILTERS,
      filteredValue: params.topics,
      render: (_, row) => (row.analysis ? TOPIC_LABEL[row.analysis.topic] : null),
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
      sentiments: (filters.sentiment ?? []).filter(isSentiment),
      topics: (filters.topic ?? []).filter(isTopic),
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
          scroll={{ x: 1180 }}
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
