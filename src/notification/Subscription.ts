import { v4 } from "uuid";

export interface Subscription {
  type: string;
}

export const generateSubscriptionId = (topic: string): string => {
  return encodeURIComponent(`${topic}~~~${v4()}`);
};
