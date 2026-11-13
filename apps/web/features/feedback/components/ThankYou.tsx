"use client";

import { Button, Typography } from "antd";
import type { FeedbackReceipt } from "../types";

interface ThankYouProps {
  onReset: () => void;
  receipt?: FeedbackReceipt | null;
  isDark?: boolean;
}

export function ThankYou({ onReset, receipt, isDark = false }: ThankYouProps) {
  const accentColor = isDark ? "#56856E" : "#3F6754"; // Studio Sage

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "24px 12px 16px 12px",
        gap: 20,
      }}
    >
      {/* Artisanal Wax / Wet-Paint Seal with Micro-Animation */}
      <div
        className="animate-stamp"
        style={{
          position: "relative",
          width: 84,
          height: 84,
          borderRadius: "50% 48% 52% 49% / 51% 53% 47% 49%",
          backgroundColor: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 14px 34px -8px ${accentColor}88, inset 0 -4px 8px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Specular sheen ring */}
        <div
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: "50%",
            border: "1.5px dashed rgba(255, 255, 255, 0.4)",
          }}
        />
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440 }}>
        <Typography.Title
          level={2}
          style={{
            margin: 0,
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: isDark ? "#EDEAE3" : "#1C1E21",
          }}
        >
          Thank you for your feedback
        </Typography.Title>
        <Typography.Paragraph
          style={{
            margin: 0,
            fontSize: 15,
            color: isDark ? "#A0A6B2" : "#5C6470",
            lineHeight: 1.6,
          }}
        >
          Thanks for telling us how it went. Your feedback goes straight to our product and care
          team to help us improve every batch.
        </Typography.Paragraph>
      </div>

      {/* Verified Reference Card */}
      {receipt && (
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 16,
            padding: "14px 18px",
            backgroundColor: isDark ? "#16181C" : "#F4F1EC",
            border: `1.5px solid ${isDark ? "#282C34" : "#E5DFD5"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: isDark
              ? "0 4px 20px rgba(0,0,0,0.3)"
              : "0 4px 16px rgba(74, 53, 40, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: accentColor,
                boxShadow: `0 4px 12px ${accentColor}44`,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: isDark ? "#EDEAE3" : "#1C1E21",
                }}
              >
                Submission Received
              </div>
              <div style={{ fontSize: 12, color: isDark ? "#8A92A0" : "#6E7582" }}>
                Reference #{receipt.id.toString().padStart(4, "0")}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: isDark ? "#22252B" : "#FFFFFF",
              color: accentColor,
              border: `1px solid ${accentColor}33`,
            }}
          >
            Recorded
          </div>
        </div>
      )}

      {/* Secondary Ghost Button */}
      <div style={{ marginTop: 8 }}>
        <Button
          type="text"
          onClick={onReset}
          className="tactile-btn"
          style={{
            minWidth: 200,
            height: 44,
            borderRadius: 22,
            fontWeight: 600,
            color: isDark ? "#A0A6B2" : "#6E7582",
            backgroundColor: "transparent",
            border: `1px solid ${isDark ? "#2A2E36" : "#E0DCD3"}`,
          }}
        >
          Submit another response
        </Button>
      </div>
    </div>
  );
}
