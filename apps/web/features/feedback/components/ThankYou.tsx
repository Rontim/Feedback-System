"use client";

import { Button, Result } from "antd";

interface ThankYouProps {
  onReset: () => void;
}

export function ThankYou({ onReset }: ThankYouProps) {
  return (
    <Result
      status="success"
      title="Thank you for your feedback"
      subTitle="Your response has been recorded."
      extra={<Button onClick={onReset}>Submit another response</Button>}
    />
  );
}
