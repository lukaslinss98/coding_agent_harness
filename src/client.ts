import OpenAi from "openai";
import { config } from "./config.ts";

export const client = new OpenAi({
  apiKey: config.openRouterApiKey,
  baseURL: config.openRouterBaseUrl,
});
