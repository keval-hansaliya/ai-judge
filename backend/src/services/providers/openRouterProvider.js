import { BaseProvider } from './baseProvider.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { ARENA_HYPERPARAMETERS } from '../../config/hyperparameters.js';

export class OpenRouterProvider extends BaseProvider {
  /**
   * Generates a non-streaming response with standardized hyperparameters.
   */
  async generateResponse(modelId, promptOrMessages, options = {}) {
    const startTime = Date.now();
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = options.max_tokens ?? ARENA_HYPERPARAMETERS.max_tokens;
      const frequency_penalty = options.frequency_penalty ?? ARENA_HYPERPARAMETERS.frequency_penalty;
      const presence_penalty = options.presence_penalty ?? ARENA_HYPERPARAMETERS.presence_penalty;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/keval-hansaliya/ai-judge",
          "X-Title": "AI Judge MVP"
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature,
          top_p,
          max_tokens,
          frequency_penalty,
          presence_penalty
        }),
        signal: AbortSignal.timeout(45000)
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
      const choice = data.choices?.[0];
      const msg = choice?.message;
      // Handle both standard content and reasoning-first models
      const text = msg?.content || msg?.reasoning || "";
      const finishReason = choice?.finish_reason || "stop";
      const isTruncated = finishReason === "length";
      const latencyMs = Date.now() - startTime;

      if (!text) {
        throw new ApiError(502, "AI model returned an empty response.");
      }

      if (options.includeMetadata) {
        return {
          text,
          latencyMs,
          finishReason,
          isTruncated,
          usage: data.usage || null,
          hyperparameters: { temperature, top_p, max_tokens, frequency_penalty, presence_penalty }
        };
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

  /**
   * Streams token responses via SSE with standardized hyperparameters.
   */
  async streamResponse(modelId, promptOrMessages, onChunk, options = {}) {
    const startTime = Date.now();
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = options.max_tokens ?? ARENA_HYPERPARAMETERS.max_tokens;
      const frequency_penalty = options.frequency_penalty ?? ARENA_HYPERPARAMETERS.frequency_penalty;
      const presence_penalty = options.presence_penalty ?? ARENA_HYPERPARAMETERS.presence_penalty;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/keval-hansaliya/ai-judge",
          "X-Title": "AI Judge MVP"
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
          temperature,
          top_p,
          max_tokens,
          frequency_penalty,
          presence_penalty
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          502,
          `OpenRouter API failure: ${errorData.error?.message || response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullText = "";
      let finishReason = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // save incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const choice = json.choices?.[0];
              const chunk = choice?.delta?.content || choice?.delta?.reasoning || "";
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
              if (chunk) {
                fullText += chunk;
                if (typeof onChunk === 'function') onChunk(chunk);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      const isTruncated = finishReason === "length";

      if (options.includeMetadata) {
        return {
          text: fullText,
          latencyMs,
          finishReason: finishReason || "stop",
          isTruncated,
          hyperparameters: { temperature, top_p, max_tokens, frequency_penalty, presence_penalty }
        };
      }

      return fullText;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Streaming error: ${error.message}`);
    }
  }
}
