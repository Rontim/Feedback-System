"use client";

import {
  Button,
  ConfigProvider,
  Flex,
  Form,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { getQuestionnaireTheme } from "../../../app/theme";
import { submitFeedback } from "../api";
import { CONTACT_STEP_TITLE, RATING_QUESTIONS } from "../questions";
import {
  FORM_FIELDS,
  type FeedbackFormValues,
  type FeedbackReceipt,
} from "../types";
import { ContactStep } from "./ContactStep";
import { RatingStep } from "./RatingStep";
import { ThankYou } from "./ThankYou";

const CONTACT_STEP = RATING_QUESTIONS.length;
const STEP_TITLES = [...RATING_QUESTIONS.map((q) => q.stepTitle), CONTACT_STEP_TITLE];
const INITIAL_VALUES: Partial<FeedbackFormValues> = { customer_type: "homeowner" };

interface FeedbackQuestionnaireProps {
  initialDarkMode?: boolean;
}

export function FeedbackQuestionnaire({
  initialDarkMode = false,
}: FeedbackQuestionnaireProps) {
  const [form] = Form.useForm<FeedbackFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);
  const [isDark, setIsDark] = useState(initialDarkMode);

  // Sync data-theme attribute with DOM for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const isContactStep = step === CONTACT_STEP;
  const question = RATING_QUESTIONS[step];
  const progressPercent = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    const outcome = await submitFeedback(form.getFieldsValue(true));
    setSubmitting(false);

    if (outcome.ok) {
      // Transition directly to the Thank-You screen without redundant overlapping toast
      setReceipt(outcome.receipt);
      return;
    }

    switch (outcome.kind) {
      case "validation": {
        const { fieldErrors } = outcome;
        form.setFields(
          FORM_FIELDS.flatMap((name) => {
            const error = fieldErrors[name];
            return error ? [{ name, errors: [error] }] : [];
          }),
        );
        const ratingStep = RATING_QUESTIONS.findIndex((q) => fieldErrors[q.key] !== undefined);
        if (ratingStep >= 0) setStep(ratingStep);
        messageApi.error("Please check the highlighted fields.");
        return;
      }
      case "throttled":
        messageApi.warning("Too many submissions. Please wait a minute and try again.");
        return;
      case "network":
        messageApi.error("Could not reach the server. Check your connection and try again.");
        return;
      case "server":
        messageApi.error("Something went wrong on our side. Please try again.");
        return;
    }
  };

  const handleFinish = (): void => {
    if (isContactStep) {
      void submit();
    } else {
      setStep((current) => current + 1);
    }
  };

  const reset = (): void => {
    form.resetFields();
    setReceipt(null);
    setStep(0);
  };

  const currentTheme = getQuestionnaireTheme(isDark);

  return (
    <ConfigProvider theme={currentTheme}>
      {contextHolder}
      <div
        className="canvas-grain"
        style={{
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
          borderRadius: 24,
          backgroundColor: isDark ? "#191B1F" : "#FFFFFF",
          border: `1.5px solid ${isDark ? "#2A2E35" : "#E8E2D8"}`,
          boxShadow: isDark
            ? "0 24px 60px -15px rgba(0, 0, 0, 0.65)"
            : "0 20px 50px -15px rgba(74, 53, 40, 0.1), 0 2px 6px rgba(74, 53, 40, 0.04)",
          overflow: "hidden",
          transition: "background-color 0.35s ease, border-color 0.35s ease",
        }}
      >
        {/* Grounded Brand Header Bar */}
        <div
          style={{
            padding: "18px 24px 14px 24px",
            borderBottom: `1px solid ${isDark ? "#262930" : "#F0ECE4"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Paint Droplet Monogram */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50% 50% 40% 60% / 60% 40% 60% 40%",
                backgroundColor: isDark ? "#DE6B48" : "#C85A32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: 14,
                boxShadow: isDark
                  ? "0 0 16px rgba(222, 107, 72, 0.4)"
                  : "0 4px 12px rgba(200, 90, 50, 0.25)",
                flexShrink: 0,
              }}
            >
              X
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isDark ? "#DE6B48" : "#C85A32",
                }}
              >
                Company X
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: isDark ? "#8A92A0" : "#7A8290",
                }}
              >
                Quality Paints & Coatings
              </div>
            </div>
          </div>

          {/* Theme & Pace Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? "#8A92A0" : "#8E949F",
                backgroundColor: isDark ? "#22252B" : "#F5F3EE",
                padding: "3px 8px",
                borderRadius: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              &lt; 60s
            </span>
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="tactile-btn"
              style={{
                background: isDark ? "#22252B" : "#F4F1EC",
                border: `1px solid ${isDark ? "#2F333C" : "#E2DDD3"}`,
                borderRadius: 20,
                padding: "5px 11px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                color: isDark ? "#EDEAE3" : "#1C1E21",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {isDark ? (
                <>
                  <span style={{ fontSize: 13 }}>☀️</span>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 13 }}>🌙</span>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inner Questionnaire Area */}
        <div style={{ padding: "20px 24px 26px 24px" }}>
          {receipt ? (
            <ThankYou onReset={reset} receipt={receipt} isDark={isDark} />
          ) : (
            <Flex vertical gap="middle">
              {/* Clean Progress Tracker */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <span
                    aria-live="polite"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isDark ? "#A0A6B2" : "#6E7582",
                    }}
                  >
                    Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
                  </span>
                </div>

                {/* Progress bar line */}
                <div
                  style={{
                    height: 5,
                    width: "100%",
                    borderRadius: 3,
                    backgroundColor: isDark ? "#22252B" : "#EFECE6",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      borderRadius: 3,
                      backgroundColor: isDark ? "#DE6B48" : "#C85A32",
                      boxShadow: isDark
                        ? "0 0 10px rgba(222, 107, 72, 0.6)"
                        : "0 0 8px rgba(200, 90, 50, 0.4)",
                      transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>

                {/* Swatch Pill Stepper */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: 4,
                  }}
                >
                  {STEP_TITLES.map((title, i) => {
                    const isCompleted = i < step;
                    const isCurrent = i === step;
                    return (
                      <button
                        key={title}
                        type="button"
                        disabled={submitting || (!isCompleted && !isCurrent)}
                        onClick={() => {
                          if (isCompleted) setStep(i);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "2px 4px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: isCompleted ? "pointer" : "default",
                          opacity: isCurrent || isCompleted ? 1 : 0.4,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor:
                              isCurrent || isCompleted
                                ? isDark
                                  ? "#DE6B48"
                                  : "#C85A32"
                                : isDark
                                  ? "#3E434D"
                                  : "#D4CEBE",
                            transform: isCurrent ? "scale(1.35)" : "scale(1)",
                            transition: "all 0.25s ease",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: isCurrent ? 650 : 500,
                            color: isCurrent
                              ? isDark
                                ? "#EDEAE3"
                                : "#1C1E21"
                              : isDark
                                ? "#7A8290"
                                : "#8E949F",
                          }}
                        >
                          {title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Content */}
              <Form<FeedbackFormValues>
                form={form}
                layout="vertical"
                requiredMark={false}
                initialValues={INITIAL_VALUES}
                disabled={submitting}
                scrollToFirstError
                onFinish={handleFinish}
              >
                <div style={{ minHeight: 200, paddingTop: 6 }}>
                  {isContactStep ? (
                    <ContactStep isDark={isDark} />
                  ) : (
                    <RatingStep key={question.key} question={question} isDark={isDark} />
                  )}
                </div>

                {/* Footer Navigation Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: `1px solid ${isDark ? "#24272F" : "#F0ECE4"}`,
                  }}
                >
                  {step > 0 ? (
                    <Button
                      onClick={() => setStep((current) => current - 1)}
                      disabled={submitting}
                      className="tactile-btn"
                      style={{
                        height: 44,
                        padding: "0 22px",
                        borderRadius: 22,
                        fontWeight: 600,
                      }}
                    >
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitting}
                    className="tactile-btn"
                    style={{
                      height: 44,
                      padding: "0 28px",
                      borderRadius: 22,
                      fontWeight: 650,
                      backgroundColor: isDark ? "#DE6B48" : "#C85A32",
                      borderColor: isDark ? "#DE6B48" : "#C85A32",
                      boxShadow: isDark
                        ? "0 4px 16px rgba(222, 107, 72, 0.4)"
                        : "0 4px 14px rgba(200, 90, 50, 0.3)",
                    }}
                  >
                    {isContactStep ? "Submit feedback" : "Next"}
                  </Button>
                </div>
              </Form>
            </Flex>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}
