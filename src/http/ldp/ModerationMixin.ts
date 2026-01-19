import { Readable } from 'node:stream';
import { promises as fs, readFileSync } from 'node:fs';
import type { Operation } from '../../http/Operation';
import { getLoggerFor } from '../../logging/LogUtil';
import { ForbiddenHttpError } from '../../util/errors/ForbiddenHttpError';
import { ModerationConfig } from '../../moderation/ModerationConfig';
import type { SightEngineResult, SightEngineTextResult, SightEngineVideoResult }
  from '../../moderation/SightEngineClient';
import { SightEngineClient } from '../../moderation/SightEngineClient';
import { ModerationStore } from '../../moderation/ModerationStore';
import { guardStream } from '../../util/GuardedStream';

/**
 * Shared moderation functionality for operation handlers
 */
export class ModerationMixin {
  protected readonly logger = getLoggerFor(this);
  private readonly moderationConfig: ModerationConfig;
  private readonly moderationStore?: ModerationStore;

  public constructor(moderationConfig?: ModerationConfig) {
    this.moderationConfig = moderationConfig ?? this.loadModerationConfig();
    this.moderationStore = this.moderationConfig.auditLogging.enabled ?
      new ModerationStore(this.moderationConfig.auditLogging.storePath) :
      undefined;
  }

  private loadModerationConfig(): ModerationConfig {
    try {
      const configData = readFileSync('./config/moderation-settings.json', 'utf8');
      const processedConfig = this.processEnvironmentVariables(configData);
      const settings = JSON.parse(processedConfig) as Record<string, unknown>;
      return new ModerationConfig(settings);
    } catch (error) {
      this.logger.warn(`Failed to load moderation settings: ${(error as Error).message}`);
      return new ModerationConfig({ enabled: false, auditLogging: { enabled: true }});
    }
  }

  private processEnvironmentVariables(configData: string): string {
    return configData.replaceAll(/\$\{([^}]+)\}/gu, (match, varExpr: string): string => {
      const [ varName, defaultValue ] = varExpr.split(':-');
      return process.env[varName] ?? defaultValue ?? match;
    });
  }

  public async moderateContent(operation: Operation): Promise<void> {
    if (!this.moderationConfig.enabled) {
      return;
    }
    if (!operation.body?.data) {
      return;
    }

    if (this.isImageUpload(operation)) {
      await this.moderateImageContent(operation);
    } else if (this.isTextUpload(operation)) {
      await this.moderateTextContent(operation);
    } else if (this.isVideoUpload(operation)) {
      await this.moderateVideoContent(operation);
    }
  }

  private isImageUpload(operation: Operation): boolean {
    return operation.body?.metadata?.contentType?.startsWith('image/') === true;
  }

  private isTextUpload(operation: Operation): boolean {
    const contentType = operation.body?.metadata?.contentType;
    return contentType?.startsWith('text/') === true ||
      contentType === 'application/json' ||
      contentType === 'text/turtle' ||
      contentType === 'application/ld+json';
  }

  private isVideoUpload(operation: Operation): boolean {
    return operation.body?.metadata?.contentType?.startsWith('video/') === true;
  }

  private async moderateImageContent(operation: Operation): Promise<void> {
    if (!this.moderationConfig.images.enabled) {
      return;
    }

    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType ?? 'image/unknown';
    this.logger.info(`MODERATION: Analyzing ${contentType} for ${path}`);

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }

    const buffer = Buffer.concat(chunks);
    this.logger.info(`MODERATION: Buffer created - size: ${buffer.length} bytes for ${path}`);
    operation.body.data = guardStream(Readable.from(buffer));

    const tempFile = `/tmp/moderation_${Date.now()}.jpg`;
    await fs.writeFile(tempFile, buffer);

    try {
      const client = new SightEngineClient(
        this.moderationConfig.sightEngine.apiUser,
        this.moderationConfig.sightEngine.apiSecret,
      );

      this.logger.info(`MODERATION: Calling SightEngine API for ${path}`);
      const startTime = Date.now();
      const result = await client.analyzeImage(tempFile);
      const analysisTime = Date.now() - startTime;

      this.logger.info(`MODERATION: API response received in ${analysisTime}ms for ${path}`);
      this.logger.info(
        `MODERATION: Scores - Nudity: ${result.nudity?.raw ?? 0}, Violence: ${result.violence}, ` +
        `Gore: ${result.gore}, Weapon: ${result.weapon}, Alcohol: ${result.alcohol}, ` +
        `Drugs: ${result.drugs}, Offensive: ${result.offensive}, Self-harm: ${result.selfharm}, ` +
        `Gambling: ${result.gambling}, Profanity: ${result.profanity}, Personal Info: ${result.personalInfo}`,
      );

      const violations = this.checkImageViolations(
        result,
        this.moderationConfig.images.thresholds,
      );

      if (violations.length > 0) {
        this.logger.warn(`MODERATION: CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);

        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'image',
            resourcePath: operation.target.path,
            userWebId: undefined,
            violations: violations.map((v): { model: string; score: number; threshold: number } => ({
              model: v.split('(')[0],
              score: Number.parseFloat(v.split('(')[1]),
              threshold: 0,
            })),
            contentSize: buffer.length,
          });
        }
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }

      this.logger.info(`MODERATION: Content approved for ${path} - all thresholds passed`);
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        throw error;
      }
      this.logger.error(`MODERATION: Analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn('MODERATION: Allowing content through due to analysis failure (fail-open policy)');
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async moderateTextContent(operation: Operation): Promise<void> {
    if (!this.moderationConfig.text.enabled) {
      return;
    }

    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType ?? 'text/unknown';
    this.logger.info(`MODERATION: Analyzing text ${contentType} for ${path}`);

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }

    const buffer = Buffer.concat(chunks);
    const text = buffer.toString('utf8');

    if (!text?.trim()) {
      return;
    }

    this.logger.info(`MODERATION: Text extracted - length: ${text.length} characters for ${path}`);

    operation.body.data = guardStream(Readable.from(buffer));

    const client = new SightEngineClient(
      this.moderationConfig.sightEngine.apiUser,
      this.moderationConfig.sightEngine.apiSecret,
    );

    try {
      this.logger.info(`MODERATION: Calling SightEngine Text API for ${path}`);
      const startTime = Date.now();
      const result = await client.analyzeText(text);
      const analysisTime = Date.now() - startTime;

      this.logger.info(`MODERATION: Text API response received in ${analysisTime}ms for ${path}`);
      this.logger.info(
        `MODERATION: Text Scores - Sexual: ${result.sexual}, Discriminatory: ${result.discriminatory}, ` +
        `Insulting: ${result.insulting}, Violent: ${result.violent}, Toxic: ${result.toxic}, ` +
        `Self-harm: ${result.selfharm}, Personal Info: ${result.personalInfo}`,
      );

      const violations = this.checkTextViolations(
        result,
        this.moderationConfig.text.thresholds,
      );

      if (violations.length > 0) {
        this.logger.warn(`MODERATION: TEXT CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);

        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'text',
            resourcePath: operation.target.path,
            userWebId: undefined,
            violations: violations.map((v): { model: string; score: number; threshold: number } => ({
              model: v.split('(')[0],
              score: Number.parseFloat(v.split('(')[1]),
              threshold: 0,
            })),
            contentSize: buffer.length,
          });
        }
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }

      this.logger.info(`MODERATION: Text content approved for ${path} - all thresholds passed`);
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        throw error;
      }
      this.logger.error(`MODERATION: Text analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn('MODERATION: Allowing text content through due to analysis failure (fail-open policy)');
    }
  }

  private async moderateVideoContent(operation: Operation): Promise<void> {
    if (!this.moderationConfig.video.enabled) {
      return;
    }

    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType ?? 'video/unknown';
    this.logger.info(`MODERATION: Analyzing video ${contentType} for ${path}`);

    const chunks: Buffer[] = [];
    for await (const chunk of operation.body.data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }

    const buffer = Buffer.concat(chunks);
    this.logger.info(`MODERATION: Video buffer created - size: ${buffer.length} bytes for ${path}`);
    operation.body.data = guardStream(Readable.from(buffer));

    const tempFile = `/tmp/moderation_${Date.now()}.mp4`;
    await fs.writeFile(tempFile, buffer);

    try {
      const client = new SightEngineClient(
        this.moderationConfig.sightEngine.apiUser,
        this.moderationConfig.sightEngine.apiSecret,
      );

      this.logger.info(`MODERATION: Calling SightEngine Video API for ${path}`);
      const startTime = Date.now();
      const result = await client.analyzeVideo(tempFile);
      const analysisTime = Date.now() - startTime;

      this.logger.info(`MODERATION: Video API response received in ${analysisTime}ms for ${path}`);
      this.logger.info(
        `MODERATION: Video Results - Nudity: ${result.nudity?.raw ?? 0}, Violence: ${result.violence}, ` +
        `Gore: ${result.gore}, Weapon: ${result.weapon}, Alcohol: ${result.alcohol}, ` +
        `Offensive: ${result.offensive}, Self-harm: ${result.selfharm}, Gambling: ${result.gambling}, ` +
        `Drugs: ${result.drugs}, Tobacco: ${result.tobacco}`,
      );

      const violations = this.checkVideoViolations(
        result,
        this.moderationConfig.video.thresholds,
      );

      if (violations.length > 0) {
        this.logger.warn(`MODERATION: VIDEO CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);

        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'video',
            resourcePath: operation.target.path,
            userWebId: undefined,
            violations: violations.map((v): { model: string; score: number; threshold: number } => ({
              model: v.split('(')[0],
              score: Number.parseFloat(v.split('(')[1]),
              threshold: 0,
            })),
            contentSize: buffer.length,
          });
        }
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }

      this.logger.info(`MODERATION: Video content approved for ${path} - all thresholds passed`);
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        throw error;
      }
      this.logger.error(`MODERATION: Video analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn('MODERATION: Allowing video content through due to analysis failure (fail-open policy)');
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private checkImageViolations(
    result: SightEngineResult,
    thresholds: ModerationConfig['images']['thresholds'],
  ): string[] {
    const violations = [];
    if (result.nudity?.raw && result.nudity.raw > thresholds.nudity) {
      violations.push(`nudity(${result.nudity.raw})`);
    }
    if (result.violence > thresholds.violence) {
      violations.push(`violence(${result.violence})`);
    }
    if (result.gore > thresholds.gore) {
      violations.push(`gore(${result.gore})`);
    }
    if (result.weapon > thresholds.weapon) {
      violations.push(`weapon(${result.weapon})`);
    }
    if (result.alcohol > thresholds.alcohol) {
      violations.push(`alcohol(${result.alcohol})`);
    }
    if (result.drugs > thresholds.drugs) {
      violations.push(`drugs(${result.drugs})`);
    }
    if (result.offensive > thresholds.offensive) {
      violations.push(`offensive(${result.offensive})`);
    }
    if (result.selfharm > thresholds.selfharm) {
      violations.push(`selfharm(${result.selfharm})`);
    }
    if (result.gambling > thresholds.gambling) {
      violations.push(`gambling(${result.gambling})`);
    }
    if (result.profanity > thresholds.profanity) {
      violations.push(`profanity(${result.profanity})`);
    }
    if (result.personalInfo > thresholds.personalInfo) {
      violations.push(`personalInfo(${result.personalInfo})`);
    }
    return violations;
  }

  private checkTextViolations(
    result: SightEngineTextResult,
    thresholds: ModerationConfig['text']['thresholds'],
  ): string[] {
    const violations = [];
    if (result.sexual > thresholds.sexual) {
      violations.push(`sexual(${result.sexual})`);
    }
    if (result.discriminatory > thresholds.discriminatory) {
      violations.push(`discriminatory(${result.discriminatory})`);
    }
    if (result.insulting > thresholds.insulting) {
      violations.push(`insulting(${result.insulting})`);
    }
    if (result.violent > thresholds.violent) {
      violations.push(`violent(${result.violent})`);
    }
    if (result.toxic > thresholds.toxic) {
      violations.push(`toxic(${result.toxic})`);
    }
    if (result.selfharm > thresholds.selfharm) {
      violations.push(`selfharm(${result.selfharm})`);
    }
    if (result.personalInfo > thresholds.personalInfo) {
      violations.push(`personalInfo(${result.personalInfo})`);
    }
    return violations;
  }

  private checkVideoViolations(
    result: SightEngineVideoResult,
    thresholds: ModerationConfig['video']['thresholds'],
  ): string[] {
    const violations = [];
    if (result.nudity?.raw && result.nudity.raw > thresholds.nudity) {
      violations.push(`nudity(${result.nudity.raw})`);
    }
    if (result.violence > thresholds.violence) {
      violations.push(`violence(${result.violence})`);
    }
    if (result.gore > thresholds.gore) {
      violations.push(`gore(${result.gore})`);
    }
    if (result.weapon > thresholds.weapon) {
      violations.push(`weapon(${result.weapon})`);
    }
    if (result.alcohol > thresholds.alcohol) {
      violations.push(`alcohol(${result.alcohol})`);
    }
    if (result.offensive > thresholds.offensive) {
      violations.push(`offensive(${result.offensive})`);
    }
    if (result.selfharm > thresholds.selfharm) {
      violations.push(`selfharm(${result.selfharm})`);
    }
    if (result.gambling > thresholds.gambling) {
      violations.push(`gambling(${result.gambling})`);
    }
    if (result.drugs > thresholds.drugs) {
      violations.push(`drugs(${result.drugs})`);
    }
    if (result.tobacco > thresholds.tobacco) {
      violations.push(`tobacco(${result.tobacco})`);
    }
    return violations;
  }
}
