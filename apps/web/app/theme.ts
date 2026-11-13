import { theme, type ThemeConfig } from "antd";

/** Atelier Brand Pigments */
export const BRAND_PIGMENTS = {
  terracotta: {
    name: "Raw Terracotta",
    light: "#C85A32",
    dark: "#DE6B48",
    bgLight: "#FDF3EF",
    bgDark: "#2B1C17",
  },
  ochre: {
    name: "Mineral Ochre",
    light: "#D9822B",
    dark: "#E5953F",
    bgLight: "#FDF7EE",
    bgDark: "#2B2116",
  },
  sand: {
    name: "Chalk Primer",
    light: "#828776",
    dark: "#9FA393",
    bgLight: "#F5F6F3",
    bgDark: "#232521",
  },
  sage: {
    name: "Studio Sage",
    light: "#3F6754",
    dark: "#56856E",
    bgLight: "#EEF5F1",
    bgDark: "#17241E",
  },
  teal: {
    name: "Lapis Sheen",
    light: "#1A535C",
    dark: "#337A85",
    bgLight: "#EAF4F5",
    bgDark: "#142529",
  },
} as const;

/** Global enterprise theme. Tokens only: no custom CSS classes. */
export const baseTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1d4f91",
    borderRadius: 6,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

/**
 * Returns a high-end bespoke ThemeConfig for the Paint Atelier Questionnaire.
 * Seamlessly transitions between gallery cream and deep obsidian charcoal.
 */
export function getQuestionnaireTheme(isDark = false): ThemeConfig {
  const primaryColor = isDark
    ? BRAND_PIGMENTS.terracotta.dark
    : BRAND_PIGMENTS.terracotta.light;

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: primaryColor,
      colorInfo: primaryColor,
      colorSuccess: isDark ? BRAND_PIGMENTS.sage.dark : BRAND_PIGMENTS.sage.light,
      colorWarning: isDark ? BRAND_PIGMENTS.ochre.dark : BRAND_PIGMENTS.ochre.light,
      borderRadius: 12,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 16,
      controlHeight: 46,
      colorBgBase: isDark ? "#131417" : "#FAF8F5",
      colorBgContainer: isDark ? "#1A1C20" : "#FFFFFF",
      colorBgElevated: isDark ? "#22252B" : "#FFFFFF",
      colorBorder: isDark ? "#2E323B" : "#E5DFD5",
      colorBorderSecondary: isDark ? "#24272F" : "#EFEBE4",
      colorText: isDark ? "#EDEAE3" : "#1C1E21",
      colorTextSecondary: isDark ? "#A0A6B2" : "#5C6470",
      colorTextTertiary: isDark ? "#6E7582" : "#8A92A0",
    },
    components: {
      Button: {
        controlHeight: 46,
        borderRadius: 23,
        fontWeight: 600,
        primaryShadow: "none",
        defaultBorderColor: isDark ? "#2E323B" : "#E5DFD5",
        defaultBg: isDark ? "#1A1C20" : "#FFFFFF",
      },
      Input: {
        controlHeight: 48,
        borderRadius: 12,
        colorBgContainer: isDark ? "#14161A" : "#FFFFFF",
        activeBorderColor: primaryColor,
        hoverBorderColor: primaryColor,
      },
      Radio: {
        buttonSolidCheckedBg: primaryColor,
        buttonSolidCheckedActiveBg: primaryColor,
        buttonSolidCheckedHoverBg: primaryColor,
        controlHeight: 44,
      },
      Rate: {
        starSize: 36,
        starBg: isDark ? "#2A2E36" : "#D4CEBE",
      },
      Form: {
        labelFontSize: 16,
        itemMarginBottom: 22,
      },
    },
  };
}

/** Legacy export for backward compatibility */
export const questionnaireTheme: ThemeConfig = getQuestionnaireTheme(false);
