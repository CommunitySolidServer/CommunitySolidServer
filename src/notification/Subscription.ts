import { v4 } from 'uuid';

export interface Subscription {
  type: string;
}

export function generateSubscriptionId(topic: string): string {
  return encodeURIComponent(`${topic}~~~${v4()}`);
}
