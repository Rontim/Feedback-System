export interface SmsConfigDto {
  enabled: boolean;
  environment: "sandbox" | "live";
  sender_id: string;
  invite_text: string;
}

export type SmsDirection = "inbound" | "outbound";
export type SmsKind = "inbound" | "alert" | "invite" | "reply";
export type SmsStatus = "sent" | "failed" | "skipped" | "received" | "invalid" | "help" | "limited";

export interface SmsLogRow {
  id: number;
  created_at: string;
  direction: SmsDirection;
  kind: SmsKind;
  phone: string;
  body: string;
  status: SmsStatus;
  error: string;
}

export interface InviteOutcome {
  phone: string;
  status: "sent" | "failed" | "skipped";
  error: string;
}

export interface InviteResult {
  results: InviteOutcome[];
  sent: number;
  failed: number;
  skipped: number;
}
