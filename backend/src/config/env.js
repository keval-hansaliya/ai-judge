import 'dotenv/config';
import { ApiError } from '../utils/ApiError.js';

const requiredEnv = [
  "POSTGRES_URI",
  "DATABASE_URL",
  "JWT_SECRET",
  "OPENROUTER_API_KEY",
  "PORT",
];

for(const key of requiredEnv) {
  if(!process.env[key]) {
    throw new ApiError(400, `Missing required environment variable: ${key}`);
  }
}

export const env = {
  POSTGRES_URI : process.env.POSTGRES_URI,
  DATABASE_URL : process.env.DATABASE_URL,
  JWT_SECRET : process.env.JWT_SECRET,
  OPENROUTER_API_KEY : process.env.OPENROUTER_API_KEY,
  PORT : process.env.PORT,
}