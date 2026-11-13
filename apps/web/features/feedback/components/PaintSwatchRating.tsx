"use client";

import { useId, type KeyboardEvent } from "react";
import { SWATCH_TIERS, type SwatchOption } from "../questions";

interface PaintSwatchRatingProps {
  value?: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  isDark?: boolean;
  tiers?: readonly SwatchOption[];
}

/**
 * Reactive smiley micro-icon matching the rating score (1-5).
 */
function ReactiveSmiley({ rating }: { rating: number }) {
  switch (rating) {
    case 1:
      // Frown
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <circle cx="11" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <path d="M4.5 12.5 C6.5 9.5 9.5 9.5 11.5 12.5" />
        </svg>
      );
    case 2:
      // Slight downturn / hesitant
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <circle cx="11" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <path d="M5 11.5 C7 10 9 10 11 11" />
        </svg>
      );
    case 3:
      // Neutral straight line
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <circle cx="11" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <line x1="5.5" y1="11" x2="10.5" y2="11" />
        </svg>
      );
    case 4:
      // Warm gentle smile
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <circle cx="11" cy="5.5" r="0.8" fill="#FFFFFF" stroke="none" />
          <path d="M4.5 10 C6.5 13 9.5 13 11.5 10" />
        </svg>
      );
    case 5:
    default:
      // Joyful open grin with twinkle eyes
      return (
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6.5 Q5.5 4.8 7 6.5" />
          <path d="M9 6.5 Q10.5 4.8 12 6.5" />
          <path d="M4.5 9.8 Q8 14.2 11.5 9.8 Z" fill="#FFFFFF" />
        </svg>
      );
  }
}

export function PaintSwatchRating({
  value,
  onChange,
  disabled = false,
  isDark = false,
  tiers = SWATCH_TIERS,
}: PaintSwatchRatingProps) {
  const groupId = useId();

  const handleSelect = (rating: number) => {
    if (!disabled && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, currentRating: number) => {
    if (disabled || !onChange) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentRating < 5 ? currentRating + 1 : 1;
      onChange(next);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = currentRating > 1 ? currentRating - 1 : 5;
      onChange(prev);
    } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
      e.preventDefault();
      onChange(Number(e.key));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(currentRating);
    }
  };

  return (
    <div style={{ width: "100%", padding: "4px 0 8px 0" }}>
      {/* 5 Tactile Swatch Buttons */}
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 8,
          width: "100%",
        }}
      >
        {tiers.map((tier: SwatchOption) => {
          const isSelected = value === tier.rating;
          const color = isDark ? tier.colorDark : tier.colorLight;

          return (
            <div
              key={tier.rating}
              role="radio"
              tabIndex={disabled ? -1 : isSelected || (!value && tier.rating === 1) ? 0 : -1}
              aria-checked={isSelected}
              aria-label={`${tier.rating} of 5: ${tier.label}`}
              onClick={() => handleSelect(tier.rating)}
              onKeyDown={(e) => handleKeyDown(e, tier.rating)}
              className="tactile-btn swatch-card"
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                border: isSelected
                  ? `2px solid ${color}`
                  : `1.5px solid ${isDark ? "#282C34" : "#E8E2D8"}`,
                backgroundColor: isSelected
                  ? isDark
                    ? `${color}18`
                    : `${color}0F`
                  : isDark
                    ? "#181A1F"
                    : "#FAF8F5",
                transform: isSelected ? "scale(1.03)" : "scale(1)",
                boxShadow: isSelected
                  ? `0 6px 20px -3px ${color}33`
                  : "0 1px 3px rgba(0,0,0,0.03)",
                userSelect: "none",
                outline: "none",
              }}
            >
              {/* Isolated Sheen: Cannot clip badges */}
              <div className="sheen-overlay" />

              {/* Organic Wet Paint Droplet Disc */}
              <div
                style={{
                  position: "relative",
                  width: 38,
                  height: 38,
                  borderRadius: "50% 50% 46% 54% / 54% 48% 52% 46%",
                  backgroundColor: color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  boxShadow: isSelected
                    ? `inset 0 -3px 6px rgba(0,0,0,0.25), 0 4px 12px ${color}55`
                    : `inset 0 -2px 4px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)`,
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {/* Specular sheen reflection dot */}
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    left: 6,
                    width: 8,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.75)",
                    transform: "rotate(-25deg)",
                  }}
                />

                <span
                  style={{
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  {tier.rating}
                </span>

                <ReactiveSmiley rating={tier.rating} />
              </div>

              {/* Clean label: displayed on desktop, hidden on mobile to prevent truncation */}
              <div className="swatch-label-desktop">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isSelected ? color : isDark ? "#A0A6B2" : "#5C6470",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tier.label}
                </span>
              </div>

              {/* Checkmark Badge: Never clipped by overflow */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: `2px solid ${isDark ? "#191B1F" : "#FFFFFF"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    zIndex: 2,
                  }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2.5 6 5 8.5 9.5 3.5" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle Endpoint Labels: "Not great" underneath 1, "Loved it" underneath 5 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 4px 0 4px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: isDark ? "#7A8290" : "#8A92A0",
          }}
        >
          Not great
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: isDark ? "#7A8290" : "#8A92A0",
          }}
        >
          Loved it
        </span>
      </div>
    </div>
  );
}
