"use client";

import { Button, Card, Flex, Form, Steps, Typography, message } from "antd";
import { useState } from "react";
import { submitFeedback } from "../api";
import { CONTACT_STEP_TITLE, RATING_QUESTIONS } from "../questions";
import { FORM_FIELDS, type FeedbackFormValues, type FeedbackReceipt } from "../types";
import { ContactStep } from "./ContactStep";
import { RatingStep } from "./RatingStep";
import { ThankYou } from "./ThankYou";

const CONTACT_STEP = RATING_QUESTIONS.length;
const STEP_TITLES = [...RATING_QUESTIONS.map((q) => q.stepTitle), CONTACT_STEP_TITLE];
/** Numbered dots only: titles are shown in the caption so nothing overflows on narrow phones. */
const STEP_ITEMS = STEP_TITLES.map(() => ({}));
const INITIAL_VALUES: Partial<FeedbackFormValues> = { customer_type: "homeowner" };

export function FeedbackQuestionnaire() {
  const [form] = Form.useForm<FeedbackFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(null);

  const isContactStep = step === CONTACT_STEP;
  const question = RATING_QUESTIONS[step];

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    const outcome = await submitFeedback(form.getFieldsValue(true));
    setSubmitting(false);

    if (outcome.ok) {
      messageApi.success("Feedback submitted");
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

  return (
    <Card>
      {contextHolder}
      {receipt ? (
        <ThankYou onReset={reset} />
      ) : (
        <Flex vertical gap="large">
          <Flex vertical>
            <Typography.Text type="secondary">Company X</Typography.Text>
            <Typography.Title level={4}>How are we doing?</Typography.Title>
          </Flex>
          <Flex vertical gap="small">
            <Steps size="small" responsive={false} current={step} items={STEP_ITEMS} />
            <Typography.Text type="secondary" aria-live="polite">
              Step {step + 1} of {STEP_TITLES.length}: {STEP_TITLES[step]}
            </Typography.Text>
          </Flex>
          <Form<FeedbackFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={INITIAL_VALUES}
            disabled={submitting}
            scrollToFirstError
            onFinish={handleFinish}
          >
            {isContactStep ? <ContactStep /> : <RatingStep key={question.key} question={question} />}
            <Flex gap="small" justify="flex-end">
              {step > 0 && (
                <Button onClick={() => setStep((current) => current - 1)} disabled={submitting}>
                  Back
                </Button>
              )}
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isContactStep ? "Submit feedback" : "Next"}
              </Button>
            </Flex>
          </Form>
        </Flex>
      )}
    </Card>
  );
}
