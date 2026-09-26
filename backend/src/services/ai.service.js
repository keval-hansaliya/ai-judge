import { OpenRouterProvider } from './providers/openRouterProvider.js';
import { GroqProvider } from './providers/groqProvider.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { ApiError } from '../utils/ApiError.js';

const openRouterProvider = new OpenRouterProvider();
const groqProvider = new GroqProvider();
const geminiProvider = new GeminiProvider();

/**
 * Resolves the provider instance by normalized name.
 */
const getProvider = (providerName) => {
  const normalized = (providerName || '').toLowerCase().trim();
  if (normalized === 'groq') return groqProvider;
  if (normalized === 'gemini' || normalized === 'google') return geminiProvider;
  if (normalized === 'openrouter') return openRouterProvider;
  return null;
};

/**
 * Routes the prompt generation request to the appropriate model provider with standardized hyperparameters.
 * @param {string} providerName - The provider name, e.g., 'groq', 'gemini', 'openrouter'
 * @param {string} modelId - The provider's model ID
 * @param {string|Array} promptOrMessages - The user prompt or chat history
 * @param {object} [options] - Standardized hyperparameter options
 * @returns {Promise<string|object>} The generated text response (or object with metadata if options.includeMetadata is true)
 */
export const generateResponse = async (providerName, modelId, promptOrMessages, options = {}) => {
  const provider = getProvider(providerName);
  if (provider) {
    return await provider.generateResponse(modelId, promptOrMessages, options);
  }
  
  throw new ApiError(400, `Unsupported AI provider: ${providerName}. Supported providers: 'groq', 'gemini', 'openrouter'.`);
};

/**
 * Routes streaming response with standardized hyperparameters.
 * @param {string} providerName - The provider name
 * @param {string} modelId - Model ID
 * @param {string|Array} promptOrMessages - Prompt or messages array
 * @param {Function} onChunk - SSE chunk callback
 * @param {object} [options] - Standardized hyperparameter options
 */
export const streamResponse = async (providerName, modelId, promptOrMessages, onChunk, options = {}) => {
  const provider = getProvider(providerName);
  if (provider) {
    return await provider.streamResponse(modelId, promptOrMessages, onChunk, options);
  }

  throw new ApiError(400, `Unsupported AI provider: ${providerName}. Supported providers: 'groq', 'gemini', 'openrouter'.`);
};

