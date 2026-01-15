/**
 * Record of a content moderation violation for admin review.
 */
export interface ModerationRecord {
  id: string;
  timestamp: Date;
  contentType: 'image' | 'text' | 'video';
  resourcePath: string;
  userWebId?: string;
  userAgent?: string;
  clientIp?: string;
  violations: Array<{
    model: string;
    score: number;
    threshold: number;
  }>;
  contentSize: number;
  contentHash?: string;
}