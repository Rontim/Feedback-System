"use client";

import { Layout } from "antd";
import { FeedbackQuestionnaire } from "./FeedbackQuestionnaire";

export function QuestionnairePage() {
  return (
    <Layout
      style={{
        minHeight: "100dvh",
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <Layout.Content
        style={{
          width: "100%",
          maxWidth: 600,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FeedbackQuestionnaire />
      </Layout.Content>
    </Layout>
  );
}
