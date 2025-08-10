import { loadEnv } from './index';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Mock fs and dotenv
jest.mock('fs');
jest.mock('dotenv');

const mockDotenv = dotenv as jest.Mocked<typeof dotenv>;

describe('loadEnv', () => {
  // Store original process.env and process.cwd
  const originalEnv = process.env;
  const originalCwd = process.cwd;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset process.env
    process.env = { ...originalEnv };

    // Mock process.cwd
    process.cwd = jest.fn().mockReturnValue('/mock/project');

    // Default dotenv mock - returns empty parsed object
    mockDotenv.config.mockReturnValue({ parsed: {} });
  });

  afterEach(() => {
    // Restore original process.env and cwd
    process.env = originalEnv;
    process.cwd = originalCwd;
  });

  describe('basic functionality', () => {
    it('should load and validate environment variables successfully', async () => {
      // Setup
      const schema = z.object({
        ENV: z.string(),
        PORT: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          ENV: 'development',
          PORT: '3000',
        }
      });

      // Execute

      const result = await loadEnv(schema);
      console.log("result: ", result);

      // Assert
      expect(result).toEqual({
        ENV: 'development',
        PORT: '3000',
      });

      expect(mockDotenv.config).toHaveBeenCalledWith({
        path: '/mock/project/.env'
      });
    });

    it('should use default .env path when no path option provided', async () => {
      const schema = z.object({
        TEST_VAR: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: { TEST_VAR: 'value' }
      });

      await loadEnv(schema);

      expect(mockDotenv.config).toHaveBeenCalledWith({
        path: '/mock/project/.env'
      });
    });

    it('should use custom path when provided in options', async () => {
      const schema = z.object({
        TEST_VAR: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: { TEST_VAR: 'value' }
      });

      const customPath = '/custom/path/.env.test';
      await loadEnv(schema, { path: customPath });

      expect(mockDotenv.config).toHaveBeenCalledWith({
        path: customPath
      });
    });
  });

  describe('environment variable priority', () => {
    it('should prioritize process.env over .env file', async () => {
      const schema = z.object({
        NODE_ENV: z.string(),
        PORT: z.string(),
      });

      // .env file values
      mockDotenv.config.mockReturnValue({
        parsed: {
          NODE_ENV: 'development',
          PORT: '3000',
        }
      });

      // process.env values (should override)
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';

      const result = await loadEnv(schema);

      expect(result).toEqual({
        NODE_ENV: 'production',
        PORT: '8080',
      });
    });

    it('should use .env file values when process.env values are not set', async () => {
      const schema = z.object({
        NODE_ENV: z.string(),
        PORT: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          NODE_ENV: 'development',
          PORT: '3000',
        }
      });

      // Ensure process.env doesn't have these values
      delete process.env.NODE_ENV;
      delete process.env.PORT;

      const result = await loadEnv(schema);

      expect(result).toEqual({
        NODE_ENV: 'development',
        PORT: '3000',
      });
    });

    it('should merge .env file and process.env correctly', async () => {
      const schema = z.object({
        NODE_ENV: z.string(),
        PORT: z.string(),
        API_KEY: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          NODE_ENV: 'development',
          PORT: '3000',
          API_KEY: 'file-api-key',
        }
      });

      // Override only some values in process.env
      process.env.PORT = '8080';
      delete process.env.NODE_ENV;
      delete process.env.API_KEY;

      const result = await loadEnv(schema);

      expect(result).toEqual({
        NODE_ENV: 'development', // from .env file
        PORT: '8080',           // from process.env (overridden)
        API_KEY: 'file-api-key', // from .env file
      });
    });
    it('should not override env variables from OS', async () => {
      const schema = z.object({
        NODE_ENV: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          NODE_ENV: 'development',
        }
      });

      // Load the environment variables
      const result = await loadEnv(schema);

      expect(result).toEqual({
        NODE_ENV: 'test', // Should take the value from process.env
      });
    });
  });

  describe('schema validation', () => {
    it('should validate and transform values correctly', async () => {
      const schema = z.object({
        PORT: z.string().transform(val => parseInt(val, 10)),
        DEBUG: z.string().transform(val => val === 'true').pipe(z.boolean()),
        TIMEOUT: z.string().transform(Number).pipe(z.number().positive()),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          PORT: '3000',
          DEBUG: 'true',
          TIMEOUT: '30',
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        PORT: 3000,
        DEBUG: true,
        TIMEOUT: 30,
      });
    });

    it('should apply default values correctly', async () => {
      const schema = z.object({
        ENV: z.string().default('development'),
        PORT: z.string().default('3000'),
        REQUIRED_VAR: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          REQUIRED_VAR: 'present',
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        ENV: 'development',
        PORT: '3000',
        REQUIRED_VAR: 'present',
      });
    });

    it('should validate enum values correctly', async () => {
      const schema = z.object({
        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
        ENV: z.enum(['development', 'production', 'test']),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          LOG_LEVEL: 'info',
          ENV: 'development',
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        LOG_LEVEL: 'info',
        ENV: 'development',
      });
    });

    it('should validate optional fields correctly', async () => {
      const schema = z.object({
        REQUIRED_VAR: z.string(),
        OPTIONAL_VAR: z.string().optional(),
        OPTIONAL_WITH_DEFAULT: z.string().optional().default('default-value'),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          REQUIRED_VAR: 'present',
          // OPTIONAL_VAR is not provided
          // OPTIONAL_WITH_DEFAULT is not provided
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        REQUIRED_VAR: 'present',
        OPTIONAL_VAR: undefined,
        OPTIONAL_WITH_DEFAULT: 'default-value',
      });
    });
  });

  describe('error handling', () => {
    it('should throw detailed error for validation failures', async () => {
      const schema = z.object({
        PORT: z.string().transform(Number).pipe(z.number().positive()),
        EMAIL: z.string().email(),
        REQUIRED_VAR: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          PORT: 'not-a-number',
          EMAIL: 'invalid-email',
          // REQUIRED_VAR is missing
        }
      });

      await expect(loadEnv(schema)).rejects.toThrow(/⚠️  Env validation failed:/);
    });

    it('should throw error for missing required variables', async () => {
      const schema = z.object({
        REQUIRED_VAR: z.string(),
        ANOTHER_REQUIRED: z.string(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {}
      });

      await expect(loadEnv(schema)).rejects.toThrow(/⚠️  Env validation failed:/);
    });

    it('should throw error for invalid enum values', async () => {
      const schema = z.object({
        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          LOG_LEVEL: 'invalid-level',
        }
      });

      await expect(loadEnv(schema)).rejects.toThrow(/⚠️  Env validation failed:/);
    });

    it('should throw error for invalid transformations', async () => {
      const schema = z.object({
        PORT: z.string().transform(Number).pipe(z.number().positive()),
        URL: z.string().url(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          PORT: '-100', // negative number
          URL: 'not-a-url',
        }
      });

      await expect(loadEnv(schema)).rejects.toThrow(/⚠️  Env validation failed:/);
    });
  });

  describe('edge cases', () => {
    it('should handle null parsed result from dotenv', async () => {
      const schema = z.object({
        ENV: z.string().default('development'),
      });

      // Simulate dotenv returning null parsed
      mockDotenv.config.mockReturnValue({ parsed: undefined });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        ENV: 'development',
      });
    });

    it('should handle undefined parsed result from dotenv', async () => {
      const schema = z.object({
        ENV: z.string().default('development'),
      });

      // Simulate dotenv returning undefined parsed
      mockDotenv.config.mockReturnValue({ parsed: undefined });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        ENV: 'development',
      });
    });

    it('should handle empty schema', async () => {
      const schema = z.object({});

      mockDotenv.config.mockReturnValue({
        parsed: { UNUSED_VAR: 'value' }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({});
    });

    it('should handle process.env with undefined values', async () => {
      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {}
      });

      // Set process.env value to undefined explicitly
      process.env.TEST_VAR = undefined;

      const result = await loadEnv(schema);

      expect(result).toEqual({
        TEST_VAR: undefined,
      });
    });
  });

  describe('complex schema scenarios', () => {
    it('should handle array transformations', async () => {
      const schema = z.object({
        ALLOWED_ORIGINS: z.string()
          .transform(val => val.split(',').map(s => s.trim()))
          .pipe(z.array(z.string().url())),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          ALLOWED_ORIGINS: 'https://example.com, https://api.example.com ,https://admin.example.com',
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        ALLOWED_ORIGINS: [
          'https://example.com',
          'https://api.example.com',
          'https://admin.example.com'
        ],
      });
    });

    it('should handle complex validation chains', async () => {
      const schema = z.object({
        PORT: z.string()
          .regex(/^\d+$/, 'Must be a number string')
          .transform(Number)
          .pipe(z.number().int().min(1).max(65535)),

        TIMEOUT_MS: z.string()
          .transform(Number)
          .pipe(z.number().positive())
          .transform(ms => ms * 1000), // Convert seconds to milliseconds

        FEATURES: z.string()
          .transform(val => val.toLowerCase().split(',').map(s => s.trim()))
          .pipe(z.array(z.enum(['auth', 'logging', 'metrics', 'cache'])))
          .default(''),
      });

      mockDotenv.config.mockReturnValue({
        parsed: {
          PORT: '8080',
          TIMEOUT_MS: '30',
          FEATURES: 'AUTH,logging,METRICS',
        }
      });

      const result = await loadEnv(schema);

      expect(result).toEqual({
        PORT: 8080,
        TIMEOUT_MS: 30000,
        FEATURES: ['auth', 'logging', 'metrics'],
      });
    });
  });
});
