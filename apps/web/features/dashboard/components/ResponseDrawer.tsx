"use client";

import { Descriptions, Drawer, Rate, Tag, Typography } from "antd";
import { AnalysisTags } from "./AnalysisTags";
import { CATEGORY_LABEL, CATEGORY_TAG_COLOR, formatDateTime } from "../format";
import type { ResponseRow } from "../types";

interface ResponseDrawerProps {
  response: ResponseRow | null;
  onClose: () => void;
}

const QUESTIONS: readonly { key: "q_product" | "q_care" | "q_happy"; label: string }[] = [
  { key: "q_product", label: "Product experience" },
  { key: "q_care", label: "Customer care" },
  { key: "q_happy", label: "Happy with product" },
];

export function ResponseDrawer({ response, onClose }: ResponseDrawerProps) {
  return (
    <Drawer
      title={response ? `Response #${response.id}` : "Response"}
      open={response !== null}
      onClose={onClose}
      width="min(480px, 100vw)"
      destroyOnClose
    >
      {response && (
        <>
          <Descriptions bordered size="small" column={1} title="Customer">
            <Descriptions.Item label="Name">{response.customer.name || "–"}</Descriptions.Item>
            <Descriptions.Item label="Email">
              {response.customer.email ? (
                <Typography.Link href={`mailto:${response.customer.email}`}>
                  {response.customer.email}
                </Typography.Link>
              ) : (
                "–"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">{response.customer.phone}</Descriptions.Item>
            <Descriptions.Item label="Type">{response.customer.type}</Descriptions.Item>
            <Descriptions.Item label="Channel">{response.channel.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="Received">{formatDateTime(response.created_at)}</Descriptions.Item>
          </Descriptions>

          <Descriptions bordered size="small" column={1} title="Ratings" style={{ marginTop: 24 }}>
            {QUESTIONS.map(({ key, label }) => (
              <Descriptions.Item key={key} label={label}>
                <Rate disabled value={response[key]} aria-label={`${label}: ${response[key]} of 5`} />{" "}
                {response[key]}/5
              </Descriptions.Item>
            ))}
            <Descriptions.Item label="Mean">
              <Tag color={CATEGORY_TAG_COLOR[response.category]}>
                {response.mean} · {CATEGORY_LABEL[response.category]}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Descriptions bordered size="small" column={1} title="Follow-up" style={{ marginTop: 24 }}>
            <Descriptions.Item label="Comment">
              {response.comment || <Typography.Text type="secondary">No comment</Typography.Text>}
            </Descriptions.Item>
            {response.comment && (
              <Descriptions.Item label="AI tags">
                {response.analysis ? (
                  <AnalysisTags analysis={response.analysis} />
                ) : (
                  <Typography.Text type="secondary">Not analysed</Typography.Text>
                )}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Alert">
              {response.alert ? (
                <Tag color={response.alert.handled_at ? "success" : "warning"}>
                  {response.alert.handled_at ? "Handled" : "Open"}
                </Tag>
              ) : (
                <Typography.Text type="secondary">No alert (not a detractor)</Typography.Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Drawer>
  );
}
