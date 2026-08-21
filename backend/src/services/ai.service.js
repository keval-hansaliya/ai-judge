import { OpenRouterProvider } from './providers/openRouterProvider.js';
import { ApiError } from '../utils/ApiError.js';

const openRouterProvider = new OpenRouterProvider();

/**
 * Routes the prompt generation request to the appropriate model provider.
 * @param {string} providerName - The provider name, e.g., 'openrouter'
 * @param {string} modelId - The provider's model ID
 * @param {string} prompt - The user prompt
 * @returns {Promise<string>} The generated text response
 */
export const generateResponse = async (providerName, modelId, promptOrMessages) => {
  if (providerName.toLowerCase() === 'openrouter') {
    return await openRouterProvider.generateResponse(modelId, promptOrMessages);
  }
  
  throw new ApiError(400, `Unsupported AI provider: ${providerName}`);
};

export const streamResponse = async (providerName, modelId, promptOrMessages, onChunk) => {
  if (providerName.toLowerCase() === 'openrouter') {
    return await openRouterProvider.streamResponse(modelId, promptOrMessages, onChunk);
  }

  throw new ApiError(400, `Unsupported AI provider: ${providerName}`);
};
