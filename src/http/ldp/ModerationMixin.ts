import { getLoggerFor } from '../../logging/LogUtil';
import { ForbiddenHttpError } from '../../util/errors/ForbiddenHttpError';
import { ModerationConfig } from '../../moderation/ModerationConfig';
import { SightEngineClient } from '../../moderation/SightEngineClient';
import { ModerationStore } from '../../moderation/ModerationStore';
import { Readable } from 'stream';

/**
 * Shared moderation functionality for operation handlers
 */
export class ModerationMixin {
  protected readonly logger = getLoggerFor(this);
  private readonly moderationConfig: ModerationConfig;
  private readonly moderationStore?: ModerationStore;

  public constructor(moderationConfig?: ModerationConfig) {
    this.moderationConfig = moderationConfig || this.loadModerationConfig();
    this.moderationStore = this.moderationConfig.auditLogging.enabled ? 
      new ModerationStore(this.moderationConfig.auditLogging.storePath) : undefined;
  }

  private loadModerationConfig(): ModerationConfig {
    try {
      const configData = require('fs').readFileSync('./config/moderation-settings.json', 'utf8');
      const processedConfig = this.processEnvironmentVariables(configData);
      const settings = JSON.parse(processedConfig);
      return new ModerationConfig(settings);
    } catch (error) {
      this.logger.warn(`Failed to load moderation settings: ${(error as Error).message}`);
      return new ModerationConfig({ enabled: false, auditLogging: { enabled: true } });
    }
  }

  private processEnvironmentVariables(configData: string): string {
    return configData.replace(/\$\{([^}]+)\}/g, (match, varExpr) => {
      const [varName, defaultValue] = varExpr.split(':-');
      return process.env[varName] || defaultValue || '';
    });
  }

  public async moderateContent(operation: any): Promise<void> {
    if (!this.moderationConfig.enabled) return;
    if (!operation.body?.data) return; // Skip if no content body

    if (this.isImageUpload(operation)) {
      await this.moderateImageContent(operation);
    } else if (this.isTextUpload(operation)) {
      await this.moderateTextContent(operation);
    } else if (this.isVideoUpload(operation)) {
      await this.moderateVideoContent(operation);
    }
  }

  private isImageUpload(operation: any): boolean {
    return operation.body?.metadata?.contentType?.startsWith('image/') === true;
  }

  private isTextUpload(operation: any): boolean {
    const contentType = operation.body?.metadata?.contentType;
    return contentType?.startsWith('text/') === true ||
           contentType === 'application/json' ||
           contentType === 'text/turtle' ||
           contentType === 'application/ld+json';
  }

  private isVideoUpload(operation: any): boolean {
    return operation.body?.metadata?.contentType?.startsWith('video/') === true;
  }

  private async moderateImageContent(operation: any): Promise<void> {
    if (!this.moderationConfig.images.enabled) return;

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    const { guardStream } = require('../../util/GuardedStream');
    operation.body.data = guardStream(Readable.from(buffer));
    
    const tempFile = `/tmp/moderation_${Date.now()}.jpg`;
    require('fs').writeFileSync(tempFile, buffer);
    
    try {
      const client = new SightEngineClient(
        this.moderationConfig.sightEngine.apiUser, 
        this.moderationConfig.sightEngine.apiSecret
      );
      const result = await client.analyzeImage(tempFile);
      
      const violations = this.checkImageViolations(result, this.moderationConfig.images.thresholds);
      if (violations.length > 0) {
        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'image',
            resourcePath: operation.target.path,
            userWebId: operation.credentials?.webId,
            violations: violations.map(v => ({ model: v.split('(')[0], score: parseFloat(v.split('(')[1]), threshold: 0 })),
            contentSize: buffer.length
          });
        }
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }
    } finally {
      try { require('fs').unlinkSync(tempFile); } catch {}
    }
  }

  private async moderateTextContent(operation: any): Promise<void> {
    if (!this.moderationConfig.text.enabled) return;

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    const text = buffer.toString('utf8');
    if (!text?.trim()) return;

    const { guardStream } = require('../../util/GuardedStream');
    operation.body.data = guardStream(Readable.from(buffer));
    
    const client = new SightEngineClient(
      this.moderationConfig.sightEngine.apiUser, 
      this.moderationConfig.sightEngine.apiSecret
    );
    const result = await client.analyzeText(text);
    
    const violations = this.checkTextViolations(result, this.moderationConfig.text.thresholds);
    if (violations.length > 0) {
      if (this.moderationStore) {
        await this.moderationStore.recordViolation({
          contentType: 'text',
          resourcePath: operation.target.path,
          userWebId: operation.credentials?.webId,
          violations: violations.map(v => ({ model: v.split('(')[0], score: parseFloat(v.split('(')[1]), threshold: 0 })),
          contentSize: buffer.length
        });
      }
      throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
    }
  }

  private async moderateVideoContent(operation: any): Promise<void> {
    if (!this.moderationConfig.video.enabled) return;

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    const { guardStream } = require('../../util/GuardedStream');
    operation.body.data = guardStream(Readable.from(buffer));
    
    const tempFile = `/tmp/moderation_${Date.now()}.mp4`;
    require('fs').writeFileSync(tempFile, buffer);
    
    try {
      const client = new SightEngineClient(
        this.moderationConfig.sightEngine.apiUser, 
        this.moderationConfig.sightEngine.apiSecret
      );
      const result = await client.analyzeVideo(tempFile);
      
      const violations = this.checkVideoViolations(result, this.moderationConfig.video.thresholds);
      if (violations.length > 0) {
        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'video',
            resourcePath: operation.target.path,
            userWebId: operation.credentials?.webId,
            violations: violations.map(v => ({ model: v.split('(')[0], score: parseFloat(v.split('(')[1]), threshold: 0 })),
            contentSize: buffer.length
          });
        }
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }
    } finally {
      try { require('fs').unlinkSync(tempFile); } catch {}
    }
  }

  private checkImageViolations(result: any, thresholds: any): string[] {
    const violations = [];
    if (result.nudity?.raw > thresholds.nudity) violations.push(`nudity(${result.nudity.raw})`);
    if (result.violence > thresholds.violence) violations.push(`violence(${result.violence})`);
    if (result.gore > thresholds.gore) violations.push(`gore(${result.gore})`);
    if (result.weapon > thresholds.weapon) violations.push(`weapon(${result.weapon})`);
    if (result.alcohol > thresholds.alcohol) violations.push(`alcohol(${result.alcohol})`);
    if (result.drugs > thresholds.drugs) violations.push(`drugs(${result.drugs})`);
    if (result.offensive > thresholds.offensive) violations.push(`offensive(${result.offensive})`);
    if (result.selfharm > thresholds.selfharm) violations.push(`selfharm(${result.selfharm})`);
    if (result.gambling > thresholds.gambling) violations.push(`gambling(${result.gambling})`);
    if (result.profanity > thresholds.profanity) violations.push(`profanity(${result.profanity})`);
    if (result.personalInfo > thresholds.personalInfo) violations.push(`personalInfo(${result.personalInfo})`);
    return violations;
  }

  private checkTextViolations(result: any, thresholds: any): string[] {
    const violations = [];
    if (result.sexual > thresholds.sexual) violations.push(`sexual(${result.sexual})`);
    if (result.discriminatory > thresholds.discriminatory) violations.push(`discriminatory(${result.discriminatory})`);
    if (result.insulting > thresholds.insulting) violations.push(`insulting(${result.insulting})`);
    if (result.violent > thresholds.violent) violations.push(`violent(${result.violent})`);
    if (result.toxic > thresholds.toxic) violations.push(`toxic(${result.toxic})`);
    if (result.selfharm > thresholds.selfharm) violations.push(`selfharm(${result.selfharm})`);
    if (result.personalInfo > thresholds.personalInfo) violations.push(`personalInfo(${result.personalInfo})`);
    return violations;
  }

  private checkVideoViolations(result: any, thresholds: any): string[] {
    const violations = [];
    if (result.nudity?.raw > thresholds.nudity) violations.push(`nudity(${result.nudity.raw})`);
    if (result.violence > thresholds.violence) violations.push(`violence(${result.violence})`);
    if (result.gore > thresholds.gore) violations.push(`gore(${result.gore})`);
    if (result.weapon > thresholds.weapon) violations.push(`weapon(${result.weapon})`);
    if (result.alcohol > thresholds.alcohol) violations.push(`alcohol(${result.alcohol})`);
    if (result.offensive > thresholds.offensive) violations.push(`offensive(${result.offensive})`);
    if (result.selfharm > thresholds.selfharm) violations.push(`selfharm(${result.selfharm})`);
    if (result.gambling > thresholds.gambling) violations.push(`gambling(${result.gambling})`);
    if (result.drugs > thresholds.drugs) violations.push(`drugs(${result.drugs})`);
    if (result.tobacco > thresholds.tobacco) violations.push(`tobacco(${result.tobacco})`);
    return violations;
  }
}