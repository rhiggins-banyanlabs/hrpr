interface EnvConfig {
    openaiApiKey: string;
    anthropicApiKey: string;
    geminiApiKey: string;
    cohereApiKey: string;
    nodeEnv: string;
  }
  
  class EnvironmentConfig {
    private static instance: EnvironmentConfig;
    private config: EnvConfig;
  
    private constructor() {
      this.validateEnvironment();
      this.config = {
        openaiApiKey: process.env.OPENAI_API_KEY!,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
        geminiApiKey: process.env.GEMINI_API_KEY!,
        cohereApiKey: process.env.COHERE_API_KEY!,
        nodeEnv: process.env.NODE_ENV || 'development',
      };
    }
  
    public static getInstance(): EnvironmentConfig {
      if (!EnvironmentConfig.instance) {
        EnvironmentConfig.instance = new EnvironmentConfig();
      }
      return EnvironmentConfig.instance;
    }
  
    private validateEnvironment(): void {
      const requiredEnvVars = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY', 
        'GEMINI_API_KEY',
        'COHERE_API_KEY'
      ];
  
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(', ')}\n` +
          'Please check your .env.local file and ensure all API keys are set.'
        );
      }
    }
  
    public get openai(): string {
      return this.config.openaiApiKey;
    }
  
    public get anthropic(): string {
      return this.config.anthropicApiKey;
    }
  
    public get gemini(): string {
      return this.config.geminiApiKey;
    }
  
    public get cohere(): string {
      return this.config.cohereApiKey;
    }
  
    public get isDevelopment(): boolean {
      return this.config.nodeEnv === 'development';
    }
  
    public get isProduction(): boolean {
      return this.config.nodeEnv === 'production';
    }
  }
  
  export const envConfig = EnvironmentConfig.getInstance();