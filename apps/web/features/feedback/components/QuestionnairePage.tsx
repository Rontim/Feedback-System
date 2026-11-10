"use client";

import { ConfigProvider, Layout, theme } from "antd";
import { questionnaireTheme } from "../../../app/theme";
import { FeedbackQuestionnaire } from "./FeedbackQuestionnaire";

export function QuestionnairePage() {
  const { token } = theme.useToken();
  return (
    <ConfigProvider theme={questionnaireTheme}>
      <Layout style={{ minHeight: "100dvh" }}>
        <Layout.Content
          style={{ width: "100%", maxWidth: 560, margin: "0 auto", padding: token.paddingMD }}
        >
          <FeedbackQuestionnaire />
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}
