import { getLoggerFor } from '../../logging/LogUtil';
import type { ResourceStore } from '../../storage/ResourceStore';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { ForbiddenHttpError } from '../../util/errors/ForbiddenHttpError';
import { isContainerPath } from '../../util/PathUtil';
import type { AuxiliaryStrategy } from '../auxiliary/AuxiliaryStrategy';
import { CreatedResponseDescription } from '../output/response/CreatedResponseDescription';
import { ResetResponseDescription } from '../output/response/ResetResponseDescription';
import type { ResponseDescription } from '../output/response/ResponseDescription';
import type { OperationHandlerInput } from './OperationHandler';
import { OperationHandler } from './OperationHandler';
import { ModerationConfig } from '../../moderation/ModerationConfig';
import { SightEngineClient } from '../../moderation/SightEngineClient';
import { ModerationStore } from '../../moderation/ModerationStore';
import { Readable } from 'stream';
import { promises as fs } from 'fs';

/**
 * Handles PUT {@link Operation}s.
 * Calls the setRepresentation function from a {@link ResourceStore}.
 */
export class PutOperationHandler extends OperationHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly metadataStrategy: AuxiliaryStrategy;
  private readonly moderationConfig: ModerationConfig;
  private readonly moderationStore?: ModerationStore;

  public constructor(store: ResourceStore, metadataStrategy: AuxiliaryStrategy, moderationConfig?: ModerationConfig) {
    super();
    this.store = store;
    this.metadataStrategy = metadataStrategy;
    this.moderationConfig = moderationConfig || this.loadModerationConfig();
    this.moderationStore = this.moderationConfig.auditLogging.enabled ? 
      new ModerationStore(this.moderationConfig.auditLogging.storePath) : undefined;
  }

  private loadModerationConfig(): ModerationConfig {
    try {
      const configData = require('fs').readFileSync('./config/moderation-settings.json', 'utf8');
      const processedConfig = this.processEnvironmentVariables(configData);
      const settings = JSON.parse(processedConfig);
      this.validateConfig(settings);
      return new ModerationConfig(settings);
    } catch (error) {
      this.logger.warn(`Failed to load moderation settings, using defaults: ${(error as Error).message}`);
      return new ModerationConfig({ 
        enabled: false,  // Conservative default
        auditLogging: { enabled: true },
        sightEngine: { 
          apiUser: process.env.SIGHTENGINE_API_USER || '', 
          apiSecret: process.env.SIGHTENGINE_API_SECRET || '' 
        }
      });
    }
  }

  private processEnvironmentVariables(configData: string): string {
    return configData.replace(/\$\{([^}]+)\}/g, (match, varExpr) => {
      const [varName, defaultValue] = varExpr.split(':-');
      return process.env[varName] || defaultValue || '';
    });
  }

  private validateConfig(settings: any): void {
    if (settings.enabled && (!settings.sightEngine?.apiUser || !settings.sightEngine?.apiSecret)) {
      throw new Error('SightEngine API credentials required when moderation is enabled');
    }
    
    // Validate threshold ranges
    const validateThresholds = (thresholds: any, type: string) => {
      if (!thresholds) return;
      Object.entries(thresholds).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          throw new Error(`Invalid ${type} threshold ${key}: must be between 0 and 1`);
        }
      });
    };
    
    validateThresholds(settings.images?.thresholds, 'image');
    validateThresholds(settings.text?.thresholds, 'text');
    validateThresholds(settings.video?.thresholds, 'video');
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    if (operation.method !== 'PUT') {
      throw new NotImplementedHttpError('This handler only supports PUT operations');
    }
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // Check for content moderation
    if (this.isImageUpload(operation)) {
      this.logger.info(`MODERATION: Intercepting image upload to ${operation.target.path}`);
      await this.moderateImageContent(operation);
    } else if (this.isTextUpload(operation)) {
      this.logger.info(`MODERATION: Intercepting text upload to ${operation.target.path}`);
      await this.moderateTextContent(operation);
    } else if (this.isVideoUpload(operation)) {
      this.logger.info(`MODERATION: Intercepting video upload to ${operation.target.path}`);
      await this.moderateVideoContent(operation);
    }

    const targetIsContainer = isContainerPath(operation.target.path);

    // Solid, §2.1: "A Solid server MUST reject PUT, POST and PATCH requests
    // without the Content-Type header with a status code of 400."
    // https://solid.github.io/specification/protocol#http-server
    // An exception is made for LDP Containers as nothing is done with the body, so a Content-type is not required
    if (!operation.body.metadata.contentType && !targetIsContainer) {
      this.logger.warn('PUT requests require the Content-Type header to be set');
      throw new BadRequestHttpError('PUT requests require the Content-Type header to be set');
    }

    
    if (this.metadataStrategy.isAuxiliaryIdentifier(operation.target)) {
      throw new MethodNotAllowedHttpError(
        [ 'PUT' ],
        'Not allowed to create or edit metadata resources using PUT; use PATCH instead.',
      );
    }

    
    const exists = await this.store.hasResource(operation.target);
    await this.store.setRepresentation(operation.target, operation.body, operation.conditions);
    if (exists) {
      return new ResetResponseDescription();
    }
    return new CreatedResponseDescription(operation.target);
  }

  private isImageUpload(operation: any): boolean {
    const contentType = operation.body?.metadata?.contentType;
    return contentType?.startsWith('image/') === true;
  }

  private isTextUpload(operation: any): boolean {
    const contentType = operation.body?.metadata?.contentType;
    return contentType?.startsWith('text/') === true ||
           contentType === 'application/json' ||
           contentType === 'text/turtle' ||
           contentType === 'application/ld+json';
  }

  private isVideoUpload(operation: any): boolean {
    const contentType = operation.body?.metadata?.contentType;
    return contentType?.startsWith('video/') === true;
  }

  private async moderateImageContent(operation: any): Promise<void> {
    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType!;
    
    if (!this.moderationConfig.enabled || !this.moderationConfig.images.enabled) {
      this.logger.info(`MODERATION: Image moderation disabled - skipping analysis for ${path}`);
      return;
    }

    this.logger.info(`MODERATION: Analyzing ${contentType} for ${path}`);

    try {
      // Clone the stream data for analysis while preserving original
      const chunks: Buffer[] = [];
      const originalData = operation.body.data;
      
      // Collect data chunks
      for await (const chunk of originalData) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      this.logger.info(`MODERATION: Buffer created - size: ${buffer.length} bytes for ${path}`);
      
      // Create new stream from buffer for the operation
      const { guardStream } = require('../../util/GuardedStream');
      operation.body.data = guardStream(Readable.from(buffer));
      
      // Create temporary file for SightEngine API
      const tempFile = `/tmp/moderation_${Date.now()}.${this.getFileExtension(contentType)}`;
      this.logger.info(`MODERATION: Creating temp file: ${tempFile} for ${path}`);
      require('fs').writeFileSync(tempFile, buffer);
      
      try {
        // Inject SightEngine client properly instead of hardcoding credentials
        const sightEngineClient = new SightEngineClient(this.moderationConfig.sightEngine.apiUser, this.moderationConfig.sightEngine.apiSecret);
        
        this.logger.info(`MODERATION: Calling SightEngine API for ${path}`);
        const startTime = Date.now();
        const result = await sightEngineClient.analyzeImage(tempFile);
        const analysisTime = Date.now() - startTime;
        
        this.logger.info(`MODERATION: API response received in ${analysisTime}ms for ${path}`);
        this.logger.info(`MODERATION: Scores - Nudity: ${result.nudity?.raw || 0}, Violence: ${result.violence}, Gore: ${result.gore}, Weapon: ${result.weapon}, Alcohol: ${result.alcohol}, Drugs: ${result.drugs}, Offensive: ${result.offensive}, Self-harm: ${result.selfharm}, Gambling: ${result.gambling}, Profanity: ${result.profanity}, Personal Info: ${result.personalInfo}`);
        
        // Use proper configuration thresholds
        const thresholds = this.moderationConfig.images.thresholds;
        const violations = [];
        
        if (result.nudity?.raw && result.nudity.raw > thresholds.nudity) {
          violations.push(`nudity(${result.nudity.raw}>${thresholds.nudity})`);
        }
        if (result.violence > thresholds.violence) {
          violations.push(`violence(${result.violence}>${thresholds.violence})`);
        }
        if (result.gore > thresholds.gore) {
          violations.push(`gore(${result.gore}>${thresholds.gore})`);
        }
        if (result.weapon > thresholds.weapon) {
          violations.push(`weapon(${result.weapon}>${thresholds.weapon})`);
        }
        if (result.alcohol > thresholds.alcohol) {
          violations.push(`alcohol(${result.alcohol}>${thresholds.alcohol})`);
        }
        if (result.drugs > thresholds.drugs) {
          violations.push(`drugs(${result.drugs}>${thresholds.drugs})`);
        }
        if (result.offensive > thresholds.offensive) {
          violations.push(`offensive(${result.offensive}>${thresholds.offensive})`);
        }
        if (result.selfharm > thresholds.selfharm) {
          violations.push(`selfharm(${result.selfharm}>${thresholds.selfharm})`);
        }
        if (result.gambling > thresholds.gambling) {
          violations.push(`gambling(${result.gambling}>${thresholds.gambling})`);
        }
        if (result.profanity > thresholds.profanity) {
          violations.push(`profanity(${result.profanity}>${thresholds.profanity})`);
        }
        if (result.personalInfo > thresholds.personalInfo) {
          violations.push(`personalInfo(${result.personalInfo}>${thresholds.personalInfo})`);
        }
        
        if (violations.length > 0) {
          this.logger.warn(`MODERATION: CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);
          
          // Record violation for admin review
          if (this.moderationStore) {
            await this.moderationStore.recordViolation({
              contentType: 'image',
              resourcePath: path,
              userWebId: operation.credentials?.webId,
              userAgent: operation.request?.headers?.['user-agent'],
              clientIp: operation.request?.socket?.remoteAddress,
              violations: [
                ...(result.nudity?.raw && result.nudity.raw > thresholds.nudity ? [{ model: 'nudity', score: result.nudity.raw, threshold: thresholds.nudity }] : []),
                ...(result.violence > thresholds.violence ? [{ model: 'violence', score: result.violence, threshold: thresholds.violence }] : []),
                ...(result.gore > thresholds.gore ? [{ model: 'gore', score: result.gore, threshold: thresholds.gore }] : []),
                ...(result.weapon > thresholds.weapon ? [{ model: 'weapon', score: result.weapon, threshold: thresholds.weapon }] : []),
                ...(result.alcohol > thresholds.alcohol ? [{ model: 'alcohol', score: result.alcohol, threshold: thresholds.alcohol }] : []),
                ...(result.drugs > thresholds.drugs ? [{ model: 'drugs', score: result.drugs, threshold: thresholds.drugs }] : []),
                ...(result.offensive > thresholds.offensive ? [{ model: 'offensive', score: result.offensive, threshold: thresholds.offensive }] : []),
                ...(result.selfharm > thresholds.selfharm ? [{ model: 'selfharm', score: result.selfharm, threshold: thresholds.selfharm }] : []),
                ...(result.gambling > thresholds.gambling ? [{ model: 'gambling', score: result.gambling, threshold: thresholds.gambling }] : []),
                ...(result.profanity > thresholds.profanity ? [{ model: 'profanity', score: result.profanity, threshold: thresholds.profanity }] : []),
                ...(result.personalInfo > thresholds.personalInfo ? [{ model: 'personalInfo', score: result.personalInfo, threshold: thresholds.personalInfo }] : [])
              ],
              contentSize: buffer.length
            });
          }
          
          throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
        }
        
        this.logger.info(`MODERATION: Content approved for ${path} - all thresholds passed`);
      } finally {
        // Clean up temp file
        try {
          require('fs').unlinkSync(tempFile);
          this.logger.debug(`MODERATION: Temp file cleaned up: ${tempFile}`);
        } catch {
          this.logger.warn(`MODERATION: Failed to cleanup temp file: ${tempFile}`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        this.logger.error(`MODERATION: Content blocked for ${path}: Upload blocked due to policy violations`);
        throw error;
      }
      this.logger.error(`MODERATION: Analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn(`MODERATION: Allowing content through due to analysis failure (fail-open policy)`);
      // Allow content through if moderation fails (fail-open)
    }
  }

  private async moderateTextContent(operation: any): Promise<void> {
    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType!;
    
    if (!this.moderationConfig.enabled || !this.moderationConfig.text.enabled) {
      this.logger.info(`MODERATION: Text moderation disabled - skipping analysis for ${path}`);
      return;
    }

    this.logger.info(`MODERATION: Analyzing text ${contentType} for ${path}`);

    try {
      // Clone the stream data for analysis while preserving original
      const chunks: Buffer[] = [];
      const originalData = operation.body.data;
      
      // Collect data chunks
      for await (const chunk of originalData) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString('utf8');
      this.logger.info(`MODERATION: Text extracted - length: ${text.length} characters for ${path}`);
      this.logger.debug(`MODERATION: Text content preview: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      
      // Skip empty text
      if (!text || text.trim().length === 0) {
        this.logger.info(`MODERATION: Skipping empty text for ${path}`);
        return;
      }
      
      // Create new stream from buffer for the operation
      const { guardStream } = require('../../util/GuardedStream');
      operation.body.data = guardStream(Readable.from(buffer));
      
      // Inject SightEngine client properly instead of hardcoding credentials
      const sightEngineClient = new SightEngineClient(this.moderationConfig.sightEngine.apiUser, this.moderationConfig.sightEngine.apiSecret);
      
      this.logger.info(`MODERATION: Calling SightEngine Text API for ${path}`);
      const startTime = Date.now();
      const result = await sightEngineClient.analyzeText(text);
      const analysisTime = Date.now() - startTime;
      
      this.logger.info(`MODERATION: Text API response received in ${analysisTime}ms for ${path}`);
      this.logger.info(`MODERATION: Text Scores - Sexual: ${result.sexual}, Discriminatory: ${result.discriminatory}, Insulting: ${result.insulting}, Violent: ${result.violent}, Toxic: ${result.toxic}, Self-harm: ${result.selfharm}, Personal Info: ${result.personalInfo}`);
      
      // Use proper configuration thresholds
      const thresholds = this.moderationConfig.text.thresholds;
      const violations = [];
      
      if (result.sexual > thresholds.sexual) {
        violations.push(`sexual(${result.sexual}>${thresholds.sexual})`);
      }
      if (result.discriminatory > thresholds.discriminatory) {
        violations.push(`discriminatory(${result.discriminatory}>${thresholds.discriminatory})`);
      }
      if (result.insulting > thresholds.insulting) {
        violations.push(`insulting(${result.insulting}>${thresholds.insulting})`);
      }
      if (result.violent > thresholds.violent) {
        violations.push(`violent(${result.violent}>${thresholds.violent})`);
      }
      if (result.toxic > thresholds.toxic) {
        violations.push(`toxic(${result.toxic}>${thresholds.toxic})`);
      }
      if (result.selfharm > thresholds.selfharm) {
        violations.push(`selfharm(${result.selfharm}>${thresholds.selfharm})`);
      }
      if (result.personalInfo > thresholds.personalInfo) {
        violations.push(`personalInfo(${result.personalInfo}>${thresholds.personalInfo})`);
      }
      
      if (violations.length > 0) {
        this.logger.warn(`MODERATION: TEXT CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);
        
        // Record violation for admin review
        if (this.moderationStore) {
          await this.moderationStore.recordViolation({
            contentType: 'text',
            resourcePath: path,
            userWebId: operation.credentials?.webId,
            userAgent: operation.request?.headers?.['user-agent'],
            clientIp: operation.request?.socket?.remoteAddress,
            violations: [
              ...(result.sexual > thresholds.sexual ? [{ model: 'sexual', score: result.sexual, threshold: thresholds.sexual }] : []),
              ...(result.discriminatory > thresholds.discriminatory ? [{ model: 'discriminatory', score: result.discriminatory, threshold: thresholds.discriminatory }] : []),
              ...(result.insulting > thresholds.insulting ? [{ model: 'insulting', score: result.insulting, threshold: thresholds.insulting }] : []),
              ...(result.violent > thresholds.violent ? [{ model: 'violent', score: result.violent, threshold: thresholds.violent }] : []),
              ...(result.toxic > thresholds.toxic ? [{ model: 'toxic', score: result.toxic, threshold: thresholds.toxic }] : []),
              ...(result.selfharm > thresholds.selfharm ? [{ model: 'selfharm', score: result.selfharm, threshold: thresholds.selfharm }] : []),
              ...(result.personalInfo > thresholds.personalInfo ? [{ model: 'personalInfo', score: result.personalInfo, threshold: thresholds.personalInfo }] : [])
            ],
            contentSize: buffer.length
          });
        }
        
        throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
      }
      
      this.logger.info(`MODERATION: Text content approved for ${path} - all thresholds passed`);
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        this.logger.error(`MODERATION: Text content blocked for ${path}: Upload blocked due to policy violations`);
        throw error;
      }
      this.logger.error(`MODERATION: Text analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn(`MODERATION: Allowing text content through due to analysis failure (fail-open policy)`);
      // Allow content through if moderation fails (fail-open)
    }
  }

  private getFileExtension(contentType: string): string {
    switch (contentType) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/gif': return 'gif';
      case 'image/webp': return 'webp';
      default: return 'jpg';
    }
  }

  private getVideoExtension(contentType: string): string {
    switch (contentType) {
      case 'video/mp4': return 'mp4';
      case 'video/avi': return 'avi';
      case 'video/mov': return 'mov';
      case 'video/webm': return 'webm';
      case 'video/quicktime': return 'mov';
      default: return 'mp4';
    }
  }

  private async moderateVideoContent(operation: any): Promise<void> {
    const path = operation.target.path;
    const contentType = operation.body.metadata.contentType!;
    
    if (!this.moderationConfig.enabled || !this.moderationConfig.video.enabled) {
      this.logger.info(`MODERATION: Video moderation disabled - skipping analysis for ${path}`);
      return;
    }

    this.logger.info(`MODERATION: Analyzing video ${contentType} for ${path}`);

    try {
      const chunks: Buffer[] = [];
      const originalData = operation.body.data;
      
      for await (const chunk of originalData) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      
      const buffer = Buffer.concat(chunks);
      this.logger.info(`MODERATION: Video buffer created - size: ${buffer.length} bytes for ${path}`);
      
      const { guardStream } = require('../../util/GuardedStream');
      operation.body.data = guardStream(Readable.from(buffer));
      
      const tempFile = `/tmp/moderation_${Date.now()}.${this.getVideoExtension(contentType)}`;
      this.logger.info(`MODERATION: Creating temp video file: ${tempFile} for ${path}`);
      require('fs').writeFileSync(tempFile, buffer);
      
      try {
        const sightEngineClient = new SightEngineClient(this.moderationConfig.sightEngine.apiUser, this.moderationConfig.sightEngine.apiSecret);
        
        this.logger.info(`MODERATION: Calling SightEngine Video API for ${path}`);
        const startTime = Date.now();
        const result = await sightEngineClient.analyzeVideo(tempFile);
        const analysisTime = Date.now() - startTime;
        
        this.logger.info(`MODERATION: Video API response received in ${analysisTime}ms for ${path}`);
        
        const thresholds = this.moderationConfig.video.thresholds;
        const violations = [];
        
        if (result.nudity?.raw && result.nudity.raw > thresholds.nudity) {
          violations.push(`nudity(${result.nudity.raw}>${thresholds.nudity})`);
        }
        if (result.violence > thresholds.violence) {
          violations.push(`violence(${result.violence}>${thresholds.violence})`);
        }
        if (result.gore > thresholds.gore) {
          violations.push(`gore(${result.gore}>${thresholds.gore})`);
        }
        if (result.weapon > thresholds.weapon) {
          violations.push(`weapon(${result.weapon}>${thresholds.weapon})`);
        }
        if (result.alcohol > thresholds.alcohol) {
          violations.push(`alcohol(${result.alcohol}>${thresholds.alcohol})`);
        }
        if (result.offensive > thresholds.offensive) {
          violations.push(`offensive(${result.offensive}>${thresholds.offensive})`);
        }
        if (result.selfharm > thresholds.selfharm) {
          violations.push(`selfharm(${result.selfharm}>${thresholds.selfharm})`);
        }
        if (result.gambling > thresholds.gambling) {
          violations.push(`gambling(${result.gambling}>${thresholds.gambling})`);
        }
        if (result.drugs > thresholds.drugs) {
          violations.push(`drugs(${result.drugs}>${thresholds.drugs})`);
        }
        if (result.tobacco > thresholds.tobacco) {
          violations.push(`tobacco(${result.tobacco}>${thresholds.tobacco})`);
        }
        
        if (violations.length > 0) {
          this.logger.warn(`MODERATION: VIDEO CONTENT BLOCKED for ${path} - Violations: ${violations.join(', ')}`);
          
          // Record violation for admin review
          if (this.moderationStore) {
            await this.moderationStore.recordViolation({
              contentType: 'video',
              resourcePath: path,
              userWebId: operation.credentials?.webId,
              userAgent: operation.request?.headers?.['user-agent'],
              clientIp: operation.request?.socket?.remoteAddress,
              violations: [
                ...(result.nudity?.raw && result.nudity.raw > thresholds.nudity ? [{ model: 'nudity', score: result.nudity.raw, threshold: thresholds.nudity }] : []),
                ...(result.violence > thresholds.violence ? [{ model: 'violence', score: result.violence, threshold: thresholds.violence }] : []),
                ...(result.gore > thresholds.gore ? [{ model: 'gore', score: result.gore, threshold: thresholds.gore }] : []),
                ...(result.weapon > thresholds.weapon ? [{ model: 'weapon', score: result.weapon, threshold: thresholds.weapon }] : []),
                ...(result.alcohol > thresholds.alcohol ? [{ model: 'alcohol', score: result.alcohol, threshold: thresholds.alcohol }] : []),
                ...(result.offensive > thresholds.offensive ? [{ model: 'offensive', score: result.offensive, threshold: thresholds.offensive }] : []),
                ...(result.selfharm > thresholds.selfharm ? [{ model: 'selfharm', score: result.selfharm, threshold: thresholds.selfharm }] : []),
                ...(result.gambling > thresholds.gambling ? [{ model: 'gambling', score: result.gambling, threshold: thresholds.gambling }] : []),
                ...(result.drugs > thresholds.drugs ? [{ model: 'drugs', score: result.drugs, threshold: thresholds.drugs }] : []),
                ...(result.tobacco > thresholds.tobacco ? [{ model: 'tobacco', score: result.tobacco, threshold: thresholds.tobacco }] : [])
              ],
              contentSize: buffer.length
            });
          }
          
          throw new ForbiddenHttpError('Upload blocked: Content violates community guidelines');
        }
        
        this.logger.info(`MODERATION: Video content approved for ${path} - all thresholds passed`);
      } finally {
        try {
          require('fs').unlinkSync(tempFile);
          this.logger.debug(`MODERATION: Temp video file cleaned up: ${tempFile}`);
        } catch {
          this.logger.warn(`MODERATION: Failed to cleanup temp video file: ${tempFile}`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof ForbiddenHttpError) {
        this.logger.error(`MODERATION: Video content blocked for ${path}: Upload blocked due to policy violations`);
        throw error;
      }
      this.logger.error(`MODERATION: Video analysis failed for ${path}: ${(error as Error).message}`);
      this.logger.warn(`MODERATION: Allowing video content through due to analysis failure (fail-open policy)`);
    }
  }
}
