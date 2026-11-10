import type { ThemeConfig } from "antd";

/** Global enterprise theme. Tokens only: no custom CSS classes. */
export const baseTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1d4f91",
    borderRadius: 6,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

/** Public questionnaire runs on phones: 16px text avoids iOS input zoom, 44px controls fit thumbs. */
export const questionnaireTheme: ThemeConfig = {
  token: { fontSize: 16, controlHeight: 44 },
  components: {
    Rate: { starSize: 36, starBg: "#8c8c8c" },
    Form: { labelFontSize: 16 },
  },
};