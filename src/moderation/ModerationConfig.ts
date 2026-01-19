/**
 * Configuration for the content moderation system.
 */
export class ModerationConfig {
  public enabled: boolean;

  public auditLogging: {
    enabled: boolean;
    storePath: string;
  };

  public sightEngine: {
    apiUser: string;
    apiSecret: string;
  };

  public images: {
    enabled: boolean;
    thresholds: {
      nudity: number;
      violence: number;
      gore: number;
      weapon: number;
      alcohol: number;
      drugs: number;
      offensive: number;
      selfharm: number;
      gambling: number;
      profanity: number;
      personalInfo: number;
    };
  };

  public text: {
    enabled: boolean;
    thresholds: {
      sexual: number;
      discriminatory: number;
      insulting: number;
      violent: number;
      toxic: number;
      selfharm: number;
      personalInfo: number;
    };
  };

  public video: {
    enabled: boolean;
    thresholds: {
      nudity: number;
      violence: number;
      gore: number;
      weapon: number;
      alcohol: number;
      offensive: number;
      selfharm: number;
      gambling: number;
      drugs: number;
      tobacco: number;
    };
  };

  /**
   * Creates a new ModerationConfig instance.
   *
   * @param config - Moderation configuration options
   * @param config.enabled - Whether moderation is enabled globally
   * @param config.auditLogging - Audit logging configuration
   * @param config.auditLogging.enabled - Whether audit logging is enabled
   * @param config.auditLogging.storePath - Path to store audit logs
   * @param config.sightEngine - SightEngine API configuration
   * @param config.sightEngine.apiUser - SightEngine API user
   * @param config.sightEngine.apiSecret - SightEngine API secret
   * @param config.images - Image moderation configuration
   * @param config.images.enabled - Whether image moderation is enabled
   * @param config.images.thresholds - Image moderation thresholds
   * @param config.images.thresholds.nudity - Nudity threshold
   * @param config.images.thresholds.violence - Violence threshold
   * @param config.images.thresholds.gore - Gore threshold
   * @param config.images.thresholds.weapon - Weapon threshold
   * @param config.images.thresholds.alcohol - Alcohol threshold
   * @param config.images.thresholds.drugs - Drugs threshold
   * @param config.images.thresholds.offensive - Offensive content threshold
   * @param config.images.thresholds.selfharm - Self-harm threshold
   * @param config.images.thresholds.gambling - Gambling threshold
   * @param config.images.thresholds.profanity - Profanity threshold
   * @param config.images.thresholds.personalInfo - Personal info threshold
   * @param config.text - Text moderation configuration
   * @param config.text.enabled - Whether text moderation is enabled
   * @param config.text.thresholds - Text moderation thresholds
   * @param config.text.thresholds.sexual - Sexual content threshold
   * @param config.text.thresholds.discriminatory - Discriminatory content threshold
   * @param config.text.thresholds.insulting - Insulting content threshold
   * @param config.text.thresholds.violent - Violent content threshold
   * @param config.text.thresholds.toxic - Toxic content threshold
   * @param config.text.thresholds.selfharm - Self-harm content threshold
   * @param config.text.thresholds.personalInfo - Personal info threshold
   * @param config.video - Video moderation configuration
   * @param config.video.enabled - Whether video moderation is enabled
   * @param config.video.thresholds - Video moderation thresholds
   * @param config.video.thresholds.nudity - Nudity threshold
   * @param config.video.thresholds.violence - Violence threshold
   * @param config.video.thresholds.gore - Gore threshold
   * @param config.video.thresholds.weapon - Weapon threshold
   * @param config.video.thresholds.alcohol - Alcohol threshold
   * @param config.video.thresholds.offensive - Offensive content threshold
   * @param config.video.thresholds.selfharm - Self-harm threshold
   * @param config.video.thresholds.gambling - Gambling threshold
   * @param config.video.thresholds.drugs - Drugs threshold
   * @param config.video.thresholds.tobacco - Tobacco threshold
   */
  public constructor(config?: {
    enabled?: boolean;
    auditLogging?: {
      enabled?: boolean;
      storePath?: string;
    };
    sightEngine?: {
      apiUser?: string;
      apiSecret?: string;
    };
    images?: {
      enabled?: boolean;
      thresholds?: {
        nudity?: number;
        violence?: number;
        gore?: number;
        weapon?: number;
        alcohol?: number;
        drugs?: number;
        offensive?: number;
        selfharm?: number;
        gambling?: number;
        profanity?: number;
        personalInfo?: number;
      };
    };
    text?: {
      enabled?: boolean;
      thresholds?: {
        sexual?: number;
        discriminatory?: number;
        insulting?: number;
        violent?: number;
        toxic?: number;
        selfharm?: number;
        personalInfo?: number;
      };
    };
    video?: {
      enabled?: boolean;
      thresholds?: {
        nudity?: number;
        violence?: number;
        gore?: number;
        weapon?: number;
        alcohol?: number;
        offensive?: number;
        selfharm?: number;
        gambling?: number;
        drugs?: number;
        tobacco?: number;
      };
    };
  }) {
    this.enabled = config?.enabled ?? false;
    this.auditLogging = {
      enabled: config?.auditLogging?.enabled ?? this.enabled,
      storePath: config?.auditLogging?.storePath ?? './data/moderation-logs',
    };
    this.sightEngine = {
      apiUser: config?.sightEngine?.apiUser ?? '',
      apiSecret: config?.sightEngine?.apiSecret ?? '',
    };
    this.images = {
      enabled: config?.images?.enabled ?? this.enabled,
      thresholds: {
        nudity: config?.images?.thresholds?.nudity ?? 0.1,
        violence: config?.images?.thresholds?.violence ?? 0.1,
        gore: config?.images?.thresholds?.gore ?? 0.1,
        weapon: config?.images?.thresholds?.weapon ?? 0.1,
        alcohol: config?.images?.thresholds?.alcohol ?? 0.1,
        drugs: config?.images?.thresholds?.drugs ?? 0.1,
        offensive: config?.images?.thresholds?.offensive ?? 0.1,
        selfharm: config?.images?.thresholds?.selfharm ?? 0.1,
        gambling: config?.images?.thresholds?.gambling ?? 0.1,
        profanity: config?.images?.thresholds?.profanity ?? 0.1,
        personalInfo: config?.images?.thresholds?.personalInfo ?? 0.1,
      },
    };
    this.text = {
      enabled: config?.text?.enabled ?? this.enabled,
      thresholds: {
        sexual: config?.text?.thresholds?.sexual ?? 0.1,
        discriminatory: config?.text?.thresholds?.discriminatory ?? 0.1,
        insulting: config?.text?.thresholds?.insulting ?? 0.1,
        violent: config?.text?.thresholds?.violent ?? 0.1,
        toxic: config?.text?.thresholds?.toxic ?? 0.1,
        selfharm: config?.text?.thresholds?.selfharm ?? 0.1,
        personalInfo: config?.text?.thresholds?.personalInfo ?? 0.1,
      },
    };
    this.video = {
      enabled: config?.video?.enabled ?? this.enabled,
      thresholds: {
        nudity: config?.video?.thresholds?.nudity ?? 0.1,
        violence: config?.video?.thresholds?.violence ?? 0.1,
        gore: config?.video?.thresholds?.gore ?? 0.1,
        weapon: config?.video?.thresholds?.weapon ?? 0.1,
        alcohol: config?.video?.thresholds?.alcohol ?? 0.1,
        offensive: config?.video?.thresholds?.offensive ?? 0.1,
        selfharm: config?.video?.thresholds?.selfharm ?? 0.1,
        gambling: config?.video?.thresholds?.gambling ?? 0.1,
        drugs: config?.video?.thresholds?.drugs ?? 0.1,
        tobacco: config?.video?.thresholds?.tobacco ?? 0.1,
      },
    };
  }
}
