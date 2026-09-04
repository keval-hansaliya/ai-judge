import { BaseProvider } from './baseProvider.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { ARENA_HYPERPARAMETERS } from '../../config/hyperparameters.js';

export class GroqProvider extends BaseProvider {
  /**
   * Generates a non-streaming response from Groq with standardized hyperparameters.
   */
  async generateResponse(modelId, promptOrMessages, options = {}) {
    if (!env.GROQ_API_KEY) {
      throw new ApiError(500, "GROQ_API_KEY is not configured in backend environment.");
    }

    const startTime = Date.now();
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = Math.min(options.max_tokens ?? 1000, 1000);

      const requestBody = {
        model: modelId,
        messages,
        temperature,
        top_p,
        max_tokens
      };

      // Hide internal reasoning / policy deliberation for models supporting reasoning_format
      if (modelId.includes('gpt-oss') || modelId.includes('qwen') || modelId.includes('deepseek')) {
        requestBody.reasoning_format = "hidden";
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP error! Status: ${response.status}`;
        throw new ApiError(
          502,
          `Groq API failure: ${errorMessage}`,
          errorData.error ? [errorData.error] : []
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      // Only use message.content for final response; do not leak internal reasoning
      let rawText = msg?.content || "";
      if (!rawText && msg?.reasoning) {
        rawText = msg.reasoning;
      }

      // Completely strip internal thinking/scratchpad tags if any were emitted
      let text = rawText
        .replace(/^\s*<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/gi, "")
        .replace(/^\s*<(?:think|thought)>[\s\S]*/gi, "")
        .trim();


      const finishReason = choice?.finish_reason || "stop";
      const isTruncated = finishReason === "length";
      const latencyMs = Date.now() - startTime;

      if (!text) {
        throw new ApiError(502, "Groq model returned an empty response.");
      }

      if (options.includeMetadata) {
        return {
          text,
          latencyMs,
          finishReason,
          isTruncated,
          usage: data.usage || null,
          hyperparameters: { temperature, top_p, max_tokens }
        };
      }

      return text;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        502,
        `Groq failed to generate a response: ${error.message}`,
        [error.message]
      );
    }
  }

  /**
   * Streams token responses from Groq via SSE with standardized hyperparameters.
   */
  async streamResponse(modelId, promptOrMessages, onChunk, options = {}) {
    if (!env.GROQ_API_KEY) {
      throw new ApiError(500, "GROQ_API_KEY is not configured in backend environment.");
    }

    const startTime = Date.now();
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = Math.min(options.max_tokens ?? 1000, 1000);

      const requestBody = {
        model: modelId,
        messages,
        stream: true,
        temperature,
        top_p,
        max_tokens
      };

      // Hide internal reasoning / policy deliberation for models supporting reasoning_format
      if (modelId.includes('gpt-oss') || modelId.includes('qwen') || modelId.includes('deepseek')) {
        requestBody.reasoning_format = "hidden";
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          502,
          `Groq API failure: ${errorData.error?.message || response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullText = "";
      let fallbackReasoning = "";
      let finishReason = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const choice = json.choices?.[0];
              const contentChunk = choice?.delta?.content || "";
              const reasoningChunk = choice?.delta?.reasoning || "";

              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }

              // Only stream assistant content; never leak internal deliberation to user
              if (contentChunk) {
                fullText += contentChunk;
                if (typeof onChunk === 'function') onChunk(contentChunk);
              } else if (reasoningChunk) {
                fallbackReasoning += reasoningChunk;
              }
            } catch (e) {
              // ignore partial chunk JSON parsing errors
            }
          }
        }
      }

      // Failsafe: only if model produced literally zero content tokens, use reasoning fallback
      if (!fullText.trim() && fallbackReasoning.trim()) {
        fullText = fallbackReasoning;
        if (typeof onChunk === 'function') onChunk(fallbackReasoning);
      }

      // Completely strip internal thinking/scratchpad tags
      let cleanedText = fullText
        .replace(/^\s*<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/gi, "")
        .replace(/^\s*<(?:think|thought)>[\s\S]*/gi, "")
        .trim();


      const latencyMs = Date.now() - startTime;
      const isTruncated = finishReason === "length";

      if (options.includeMetadata) {
        return {
          text: cleanedText,
          latencyMs,
          finishReason: finishReason || "stop",
          isTruncated,
          hyperparameters: { temperature, top_p, max_tokens }
        };
      }

      return cleanedText;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Groq streaming error: ${error.message}`);
    }
  }
}
