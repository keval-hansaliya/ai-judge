import 'dotenv/config';
import { ApiError } from '../utils/ApiError.js';

const requiredEnv = [
  "POSTGRES_URI",
  "DATABASE_URL",
  "JWT_SECRET",
  "PORT",
];

for(const key of requiredEnv) {
  if(!process.env[key]) {
    throw new ApiError(400, `Missing required environment variable: ${key}`);
  }
}

if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
  throw new ApiError(400, "At least one AI provider API key (GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY) must be configured.");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  POSTGRES_URI: process.env.POSTGRES_URI,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: process.env.PORT,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000']
};