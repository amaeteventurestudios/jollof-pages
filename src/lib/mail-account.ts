/** An author's own Resend account as the Desk sees it (the key never leaves the server). */
export interface DnsRecord {
  record: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: string;
  status?: string;
}

export interface MailAccount {
  connected: boolean;
  keyHint?: string;
  domain?: string;
  status?: string;
  verified?: boolean;
  records?: DnsRecord[];
  fromLocal?: string;
}
