import path from "path";
import { config as dotenvConfig } from "dotenv";
import { z, ZodTypeAny, ZodError } from "zod";

/**
 * Load and validate environment variables.
 *
 * @param schema A Zod schema describing your env variables.
 * @param options Optional path/encoding overrides.
 * @returns The validated & typed env object.
 *
 * @throws If any variable fails validation – the error will list every problem.
 */
export async function loadEnv<T extends ZodTypeAny>(
  schema: T,
  options?: { path?: string; encoding?: BufferEncoding }
): Promise<z.infer<T>> {
  // Resolve the .env file
  const envPath = options?.path ?? path.resolve(process.cwd(), ".env");

  // 1️⃣ Parse the file with dotenv
  const parsed = dotenvConfig({ path: envPath }).parsed ?? {};

  // 2️⃣ Merge with process.env (OS env vars override the file)
  const merged = { ...parsed, ...process.env };

  // 3️⃣ Validate
  const result = schema.safeParse(merged);
  if (!result.success) {
    // Build a readable error list
    const error = result.error as ZodError;
    const msgs = error.format();
    const lines = Object.entries(msgs).map(
      ([key, val]) => `${key}: ${(val as any).message}`
    );
    throw new Error(`⚠️  Env validation failed:\n${lines.join("\n")}`);
  }

  // 4️⃣ Return the typed env
  return result.data;
}
