import type { Subscription } from './Subscription';

export interface Topic {
  subscriptions: Record<string, Subscription>;
}
