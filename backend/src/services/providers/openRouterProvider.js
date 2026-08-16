import { BaseProvider } from './baseProvider.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

export class OpenRouterProvider extends BaseProvider {
  async generateResponse(modelId, prompt) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/keval-hansaliya/ai-judge", // Site URL for OpenRouter ranking
          "X-Title": "AI Judge MVP"
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP error! Status: ${response.status}`;
        throw new ApiError(
          502,
          `OpenRouter API failure: ${errorMessage}`,
          errorData.error ? [errorData.error] : []
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new ApiError(502, "AI model returned an empty response.");
      }

      return text;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        502,
        "AI model failed to generate a response. Please check backend integration or try again later.",
        [error.message]
      );
    }
  }
}
