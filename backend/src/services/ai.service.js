import { OpenRouterProvider } from './providers/openRouterProvider.js';
import { ApiError } from '../utils/ApiError.js';

const openRouterProvider = new OpenRouterProvider();

/**
 * Routes the prompt generation request to the appropriate model provider with standardized hyperparameters.
 * @param {string} providerName - The provider name, e.g., 'openrouter'
 * @param {string} modelId - The provider's model ID
 * @param {string|Array} promptOrMessages - The user prompt or chat history
 * @param {object} [options] - Standardized hyperparameter options
 * @returns {Promise<string|object>} The generated text response (or object with metadata if options.includeMetadata is true)
 */
export const generateResponse = async (providerName, modelId, promptOrMessages, options = {}) => {
  if (providerName.toLowerCase() === 'openrouter') {
    return await openRouterProvider.generateResponse(modelId, promptOrMessages, options);
  }
  
  throw new ApiError(400, `Unsupported AI provider: ${providerName}`);
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
  if (providerName.toLowerCase() === 'openrouter') {
    return await openRouterProvider.streamResponse(modelId, promptOrMessages, onChunk, options);
  }

  throw new ApiError(400, `Unsupported AI provider: ${providerName}`);
};
