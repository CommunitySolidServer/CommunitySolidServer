import { createReadStream } from 'node:fs';
import { getLoggerFor } from '../logging/LogUtil';

export interface SightEngineResult {
  nudity?: { raw: number };
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
}

export interface SightEngineTextResult {
  sexual: number;
  discriminatory: number;
  insulting: number;
  violent: number;
  toxic: number;
  selfharm: number;
  personalInfo: number;
}

export interface SightEngineVideoResult {
  nudity?: { raw: number };
  violence: number;
  gore: number;
  weapon: number;
  alcohol: number;
  offensive: number;
  selfharm: number;
  gambling: number;
  drugs: number;
  tobacco: number;
}

/**
 * Client for SightEngine content moderation API.
 */
export class SightEngineClient {
  protected readonly logger = getLoggerFor(this);

  private readonly apiUser: string;
  private readonly apiSecret: string;

  public constructor(apiUser: string, apiSecret: string) {
    this.apiUser = apiUser;
    this.apiSecret = apiSecret;
  }

  public async analyzeImage(filePath: string): Promise<SightEngineResult> {
    this.logger.info(`SIGHTENGINE: Starting analysis for ${filePath}`);
    
    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;
    
    this.logger.info(`SIGHTENGINE: Creating form data for ${filePath}`);
    const form = new FormData();
    form.append('media', createReadStream(filePath));
    form.append('models', 'nudity-2.1,violence,gore,weapon,alcohol,offensive,self-harm,gambling');
    form.append('api_user', this.apiUser);
    form.append('api_secret', this.apiSecret);
    
    this.logger.info(`SIGHTENGINE: Sending request to API for ${filePath}`);
    const startTime = Date.now();
    
    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    
    const requestTime = Date.now() - startTime;
    this.logger.info(`SIGHTENGINE: API response received in ${requestTime}ms for ${filePath}`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`SIGHTENGINE: API error ${response.status} ${errorText} for ${filePath}`);
      throw new Error(`SightEngine API error: ${response.status} ${errorText}`);
    }

    this.logger.info(`SIGHTENGINE: Parsing JSON response for ${filePath}`);
    const result = await response.json() as any;
    
    const analysisResult = {
      nudity: result.nudity,
      violence: result.violence?.prob || result.violence || 0,
      gore: result.gore?.prob || result.gore || 0,
      weapon: typeof result.weapon === 'object' ? (result.weapon?.prob || 0) : (result.weapon || 0),
      alcohol: result.alcohol?.prob || result.alcohol || 0,
      drugs: 0,
      offensive: result.offensive?.prob || result.offensive || 0,
      selfharm: result['self-harm']?.prob || result['self-harm'] || 0,
      gambling: result.gambling?.prob || result.gambling || 0,
      profanity: 0,
      personalInfo: 0,
    };
    
    this.logger.info(`SIGHTENGINE: Analysis complete for ${filePath}`);
    this.logger.info(`SIGHTENGINE: Results - Nudity: ${analysisResult.nudity?.raw || 0}, Violence: ${analysisResult.violence}, Gore: ${analysisResult.gore}, Weapon: ${analysisResult.weapon}, Alcohol: ${analysisResult.alcohol}, Drugs: ${analysisResult.drugs}, Offensive: ${analysisResult.offensive}, Self-harm: ${analysisResult.selfharm}, Gambling: ${analysisResult.gambling}, Profanity: ${analysisResult.profanity}, Personal Info: ${analysisResult.personalInfo}`);
    
    return analysisResult;
  }

  public async analyzeText(text: string): Promise<SightEngineTextResult> {
    this.logger.info(`SIGHTENGINE: Starting text analysis`);
    
    // Skip analysis for empty or very short text
    if (!text || text.trim().length < 3) {
      this.logger.info(`SIGHTENGINE: Skipping analysis for empty/short text (length: ${text?.length || 0})`);
      return {
        sexual: 0,
        discriminatory: 0,
        insulting: 0,
        violent: 0,
        toxic: 0,
        selfharm: 0,
        personalInfo: 0,
      };
    }
    
    const fetch = (await import('node-fetch')).default;
    
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('models', 'text-content,personal-info');
    params.append('mode', 'standard');
    params.append('lang', 'en,es,fr,de,it,pt,nl,pl,ru');
    params.append('api_user', this.apiUser);
    params.append('api_secret', this.apiSecret);
    
    this.logger.info(`SIGHTENGINE: Sending text request to API`);
    const startTime = Date.now();
    
    const response = await fetch('https://api.sightengine.com/1.0/text/check.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    
    const requestTime = Date.now() - startTime;
    this.logger.info(`SIGHTENGINE: Text API response received in ${requestTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`SIGHTENGINE: Text API error ${response.status} ${errorText}`);
      throw new Error(`SightEngine Text API error: ${response.status} ${errorText}`);
    }

    this.logger.info(`SIGHTENGINE: Parsing text JSON response`);
    const result = await response.json() as any;
    
    // Log the raw API response for debugging
    this.logger.debug(`SIGHTENGINE: Raw API response: ${JSON.stringify(result)}`);
    
    const analysisResult = {
      sexual: this.getMatchScore(result.profanity?.matches, 'sexual'),
      discriminatory: this.getMatchScore(result.profanity?.matches, 'discriminatory'),
      insulting: this.getMatchScore(result.profanity?.matches, 'insulting'),
      violent: this.getMatchScore(result.profanity?.matches, 'violent'),
      toxic: this.getMatchScore(result.profanity?.matches, 'toxic'),
      selfharm: this.getMatchScore(result.profanity?.matches, 'self-harm'),
      personalInfo: result.personal?.matches?.length > 0 ? 1.0 : 0,
    };
    
    // If all scores are 0, log a warning
    const totalScore = Object.values(analysisResult).reduce((sum, score) => sum + score, 0);
    if (totalScore === 0) {
      this.logger.warn(`SIGHTENGINE: All moderation scores are 0 - this may indicate an API issue`);
    }
    
    this.logger.info(`SIGHTENGINE: Text analysis complete`);
    this.logger.info(`SIGHTENGINE: Text Results - Sexual: ${analysisResult.sexual}, Discriminatory: ${analysisResult.discriminatory}, Insulting: ${analysisResult.insulting}, Violent: ${analysisResult.violent}, Toxic: ${analysisResult.toxic}, Self-harm: ${analysisResult.selfharm}, Personal Info: ${analysisResult.personalInfo}`);
    
    return analysisResult;
  }

  private getMatchScore(matches: any[], type: string): number {
    if (!matches || matches.length === 0) {
      return 0;
    }
    
    const typeMatches = matches.filter(match => match.type === type);
    if (typeMatches.length === 0) {
      return 0;
    }
    
    // Convert intensity to score: high=1.0, medium=0.7, low=0.4
    const maxIntensity = typeMatches.reduce((max, match) => {
      const score = match.intensity === 'high' ? 1.0 : 
                   match.intensity === 'medium' ? 0.7 : 0.4;
      return Math.max(max, score);
    }, 0);
    
    return maxIntensity;
  }

  public async analyzeVideo(filePath: string): Promise<SightEngineVideoResult> {
    this.logger.info(`SIGHTENGINE: Starting video analysis for ${filePath}`);
    
    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;
    
    this.logger.info(`SIGHTENGINE: Creating form data for video ${filePath}`);
    const form = new FormData();
    form.append('media', createReadStream(filePath));
    form.append('models', 'nudity-2.1,violence,gore-2.0,weapon,alcohol,offensive,self-harm,gambling,recreational_drug,tobacco');
    form.append('api_user', this.apiUser);
    form.append('api_secret', this.apiSecret);
    
    this.logger.info(`SIGHTENGINE: Sending video request to API for ${filePath}`);
    const startTime = Date.now();
    
    const response = await fetch('https://api.sightengine.com/1.0/video/check.json', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    
    const requestTime = Date.now() - startTime;
    this.logger.info(`SIGHTENGINE: Video API response received in ${requestTime}ms for ${filePath}`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`SIGHTENGINE: Video API error ${response.status} ${errorText} for ${filePath}`);
      throw new Error(`SightEngine Video API error: ${response.status} ${errorText}`);
    }

    this.logger.info(`SIGHTENGINE: Parsing video JSON response for ${filePath}`);
    const result = await response.json() as any;
    
    const analysisResult = {
      nudity: result.nudity,
      violence: result.violence?.prob || result.violence || 0,
      gore: result.gore?.prob || result.gore || 0,
      weapon: typeof result.weapon === 'object' ? (result.weapon?.prob || 0) : (result.weapon || 0),
      alcohol: result.alcohol?.prob || result.alcohol || 0,
      offensive: result.offensive?.prob || result.offensive || 0,
      selfharm: result['self-harm']?.prob || result['self-harm'] || 0,
      gambling: result.gambling?.prob || result.gambling || 0,
      drugs: result.recreational_drug?.prob || result.recreational_drug || 0,
      tobacco: result.tobacco?.prob || result.tobacco || 0,
    };
    
    this.logger.info(`SIGHTENGINE: Video analysis complete for ${filePath}`);
    this.logger.info(`SIGHTENGINE: Video Results - Nudity: ${analysisResult.nudity?.raw || 0}, Violence: ${analysisResult.violence}, Gore: ${analysisResult.gore}, Weapon: ${analysisResult.weapon}, Alcohol: ${analysisResult.alcohol}, Offensive: ${analysisResult.offensive}, Self-harm: ${analysisResult.selfharm}, Gambling: ${analysisResult.gambling}, Drugs: ${analysisResult.drugs}, Tobacco: ${analysisResult.tobacco}`);
    
    return analysisResult;
  }
}