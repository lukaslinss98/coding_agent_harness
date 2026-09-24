import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string(),
});

const env = envSchema.parse(process.env);

export const config = {
  openRouterApiKey: env.OPENROUTER_API_KEY,
  openRouterBaseUrl: "https://openrouter.ai/api/v1",
  maxStepsDefault: 30,
  defaultModel: "openrouter/free",
} as const;

export type Config = typeof config;
