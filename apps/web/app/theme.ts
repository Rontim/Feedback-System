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
    light: "#D4882A",
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
    light: "#3D6B52",
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

/** Global enterprise theme. Warm palette tokens. */
export const baseTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND_PIGMENTS.terracotta.light,
    colorSuccess: BRAND_PIGMENTS.sage.light,
    colorWarning: BRAND_PIGMENTS.ochre.light,
    colorError: BRAND_PIGMENTS.terracotta.light,
    borderRadius: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

/**
 * Returns a high-end bespoke ThemeConfig for the Public Questionnaire.
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
      colorError: isDark ? BRAND_PIGMENTS.terracotta.dark : BRAND_PIGMENTS.terracotta.light,
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

/**
 * Returns a high-clarity, warm ThemeConfig for the Care Rep Dashboard.
 * Syncs seamlessly with the brand palette and supports Light and Dark mode.
 */
export function getDashboardTheme(isDark = false): ThemeConfig {
  const primaryColor = isDark
    ? BRAND_PIGMENTS.terracotta.dark
    : BRAND_PIGMENTS.terracotta.light;
  const successColor = isDark
    ? BRAND_PIGMENTS.sage.dark
    : BRAND_PIGMENTS.sage.light;
  const warningColor = isDark
    ? BRAND_PIGMENTS.ochre.dark
    : BRAND_PIGMENTS.ochre.light;
  const errorColor = isDark
    ? BRAND_PIGMENTS.terracotta.dark
    : BRAND_PIGMENTS.terracotta.light;

  return {
    algorithm: isDark
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : [theme.defaultAlgorithm, theme.compactAlgorithm],
    token: {
      colorPrimary: primaryColor,
      colorInfo: primaryColor,
      colorSuccess: successColor,
      colorWarning: warningColor,
      colorError: errorColor,

      // Soft tinted semantic badge backgrounds
      colorSuccessBg: isDark ? "#17241E" : "#EEF5F1",
      colorSuccessBorder: isDark ? "#243E31" : "#D1E6DA",
      colorWarningBg: isDark ? "#2B2116" : "#FDF7EE",
      colorWarningBorder: isDark ? "#4A361C" : "#F7E1BE",
      colorErrorBg: isDark ? "#2B1C17" : "#FDF3EF",
      colorErrorBorder: isDark ? "#48261D" : "#F8D4C8",

      borderRadius: 8,
      borderRadiusLG: 12,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      controlHeight: 32,

      // Light: Warm gallery cream background & crisp elevated off-white cards
      // Dark: Deep charcoal/obsidian surfaces (no pure #000000)
      colorBgBase: isDark ? "#121214" : "#FAF8F5",
      colorBgContainer: isDark ? "#18181B" : "#FFFFFF",
      colorBgElevated: isDark ? "#1F1F23" : "#FFFFFF",
      colorBgLayout: isDark ? "#121214" : "#FAF8F5",
      colorBorder: isDark ? "#2E323B" : "#E5DFD5",
      colorBorderSecondary: isDark ? "#24272F" : "#EFEBE4",
      colorText: isDark ? "#EDEAE3" : "#1C1E21",
      colorTextSecondary: isDark ? "#A0A6B2" : "#5C6470",
      colorTextTertiary: isDark ? "#6E7582" : "#8A92A0",
      colorTextQuaternary: isDark ? "#454B57" : "#C5BDB0",
    },
    components: {
      Card: {
        borderRadiusLG: 12,
        headerHeight: 46,
        headerFontSize: 14,
        colorBorderSecondary: isDark ? "#282C34" : "#EBE6DD",
      },
      Table: {
        borderRadius: 8,
        headerBg: isDark ? "#17171A" : "#F5F2ED",
        headerColor: isDark ? "#EDEAE3" : "#1C1E21",
        rowHoverBg: isDark ? "#202025" : "#F8F6F2",
        borderColor: isDark ? "#262930" : "#EFECE6",
      },
      Menu: {
        itemBorderRadius: 8,
        itemSelectedBg: isDark ? "#2C1D18" : "#FDF3EF",
        itemSelectedColor: primaryColor,
        itemHoverBg: isDark ? "#22252B" : "#F5F2ED",
        itemColor: isDark ? "#A0A6B2" : "#5C6470",
      },
      Button: {
        borderRadius: 8,
        controlHeight: 32,
        fontWeight: 500,
        primaryShadow: "none",
      },
      Input: {
        borderRadius: 8,
        colorBgContainer: isDark ? "#141417" : "#FFFFFF",
        activeBorderColor: primaryColor,
        hoverBorderColor: primaryColor,
      },
      DatePicker: {
        borderRadius: 8,
        colorBgContainer: isDark ? "#141417" : "#FFFFFF",
      },
      Segmented: {
        trackBg: isDark ? "#141416" : "#EFECE6",
        itemSelectedBg: isDark ? "#25252B" : "#FFFFFF",
        itemSelectedColor: isDark ? "#EDEAE3" : "#1C1E21",
        itemColor: isDark ? "#8A92A0" : "#6E7582",
        borderRadius: 6,
      },
      Tag: {
        borderRadius: 6,
      },
    },
  };
}

/** Legacy export for backward compatibility */
export const questionnaireTheme: ThemeConfig = getQuestionnaireTheme(false);
