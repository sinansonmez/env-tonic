# env-tonic 🧪

Zero‑config, type‑safe environment variable loader for TypeScript projects.

[![npm version](https://badge.fury.io/js/env-tonic.svg)](https://www.npmjs.com/package/env-tonic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Zero-config**: Works out of the box with sensible defaults
- 🛡️ **Type-safe**: Full TypeScript support with Zod schema validation
- 📁 **Flexible**: Supports custom `.env` file paths
- 🔄 **Smart merging**: OS environment variables override `.env` file values
- ❌ **Clear errors**: Detailed validation error messages
- 🎯 **Lightweight**: Minimal dependencies

## Installation

```bash
npm install env-tonic zod
```

## Quick Start

1. Create your environment schema:

```typescript
import { z } from 'zod';
import { loadEnv } from 'env-tonic';

const envSchema = z.object({
  ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  DEBUG: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
});

// Load and validate your environment
const env = await loadEnv(envSchema);

// Now use your fully typed environment variables
console.log(`Server running on port ${env.PORT}`);
console.log(`Database: ${env.DATABASE_URL}`);
```

2. Create your `.env` file:

```env
ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/myapp
API_KEY=your-secret-key
DEBUG=true
```

## API Reference

### `loadEnv(schema, options?)`

Loads and validates environment variables according to your Zod schema.

#### Parameters

- **schema** (`ZodTypeAny`): A Zod schema defining your environment variables
- **options** (optional):
    - `path?: string` - Custom path to your `.env` file (default: `process.cwd() + '/.env'`)
    - `encoding?: BufferEncoding` - File encoding (default: system default)

#### Returns

Promise that resolves to your typed environment object matching the schema.

#### Throws

Error with detailed validation messages if any environment variable fails validation.

## Usage Examples

### Basic Usage

```typescript
import { z } from 'zod';
import { loadEnv } from 'env-tonic';

const schema = z.object({
  PORT: z.string().transform(Number),
  ENV: z.string(),
});

const env = await loadEnv(schema);
console.log(`Running on port ${env.PORT}`);
```

### Advanced Schema with Transformations

```typescript
const schema = z.object({
  // String to number transformation
  PORT: z.string().transform(val => parseInt(val, 10)),
  
  // Enum validation
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Boolean transformation
  ENABLE_HTTPS: z.string()
    .transform(val => val.toLowerCase() === 'true')
    .pipe(z.boolean()),
  
  // Array transformation (comma-separated)
  ALLOWED_ORIGINS: z.string()
    .transform(val => val.split(',').map(s => s.trim()))
    .pipe(z.array(z.string().url())),
  
  // Optional with default
  MAX_CONNECTIONS: z.string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('100'),
});
```

### Custom .env File Path

```typescript
const env = await loadEnv(schema, {
  path: './config/.env.production'
});
```

### Error Handling

```typescript
try {
  const env = await loadEnv(schema);
  // Use your validated environment
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}
```

## CLI Usage

env-tonic includes a CLI tool for testing your environment configuration:

```bash
# Install globally or use npx
npm install -g env-tonic

# Test your environment (update src/index-cli.ts with your schema first)
npx envtonic
```

## Environment Variable Priority

env-tonic follows this priority order (highest to lowest):

1. **OS Environment Variables** - `process.env`
2. **`.env` File** - Your local environment file

This means you can override any `.env` file value by setting it as an OS environment variable.

## Common Patterns

### Database Configuration

```typescript
const dbSchema = z.object({
  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  DATABASE_NAME: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_SSL: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
});
```

### Service Configuration

```typescript
const serviceSchema = z.object({
  SERVICE_NAME: z.string(),
  SERVICE_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/),
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).pipe(z.number().int().positive()).default('30'),
  GRACEFUL_SHUTDOWN_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),
});
```

## TypeScript Integration

env-tonic provides full TypeScript support. Your environment object will be properly typed based on your Zod schema:

```typescript
const schema = z.object({
  PORT: z.string().transform(Number),
  DEBUG: z.string().transform(val => val === 'true').pipe(z.boolean()),
});

const env = await loadEnv(schema);
// env.PORT is typed as number
// env.DEBUG is typed as boolean
```

## Error Messages

When validation fails, env-tonic provides clear, actionable error messages:

```
⚠️  Env validation failed:
PORT: Expected number, received nan
DATABASE_URL: Invalid url
API_KEY: String must contain at least 1 character(s)
```

## Requirements

- Node.js >= 14.0.0
- TypeScript (if using TypeScript)
- Zod >= 3.0.0

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

```bash
npm test
```

## Building

```bash
npm run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Sinan Sonmez (Chaush)** - [sinansonmez@outlook.com](mailto:sinansonmez@outlook.com)

## Repository

[https://github.com/sinansonmez/env-tonic](https://github.com/sinansonmez/env-tonic)
