import { BaseProvider } from './baseProvider.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { ARENA_HYPERPARAMETERS } from '../../config/hyperparameters.js';

export class GeminiProvider extends BaseProvider {
  /**
   * Formats chat messages or prompt string into Gemini API format.
   */
  _formatContents(promptOrMessages) {
    const messages = Array.isArray(promptOrMessages)
      ? promptOrMessages
      : [{ role: "user", content: promptOrMessages }];

    let systemInstruction = undefined;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // If contents array is empty (e.g. only system message), provide empty user turn
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: '' }] });
    }

    return { contents, systemInstruction };
  }

  /**
   * Normalizes model ID to start with models/
   */
  _normalizeModelId(modelId) {
    return modelId.startsWith('models/') ? modelId : `models/${modelId}`;
  }

  /**
   * Generates a non-streaming response from Google Gemini with standardized hyperparameters.
   */
  async generateResponse(modelId, promptOrMessages, options = {}) {
    if (!env.GEMINI_API_KEY) {
      throw new ApiError(500, "GEMINI_API_KEY is not configured in backend environment.");
    }

    const startTime = Date.now();
    try {
      const normalizedModel = this._normalizeModelId(modelId);
      const { contents, systemInstruction } = this._formatContents(promptOrMessages);

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = Math.max(options.max_tokens ?? ARENA_HYPERPARAMETERS.max_tokens, 2048);

      const bodyPayload = {
        contents,
        generationConfig: {
          temperature,
          topP: top_p,
          maxOutputTokens: max_tokens
        }
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = systemInstruction;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/${normalizedModel}:generateContent?key=${env.GEMINI_API_KEY}`;
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload)
        });

        if (response.ok || (response.status !== 503 && response.status !== 429)) {
          break;
        }

        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 600 * attempt));
        }
      }


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let rawMsg = errorData.error?.message || `HTTP error! Status: ${response.status}`;
        if (response.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('rate')) {
          rawMsg = `Gemini free quota / rate limit reached for ${normalizedModel} (Google free tier limit reached). Please try Groq models or wait a moment.`;
        }
        throw new ApiError(
          502,
          `Gemini API failure: ${rawMsg}`,
          errorData.error ? [errorData.error] : []
        );
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const textParts = candidate?.content?.parts || [];
      const text = textParts.map(p => p.text || '').join('').trim();
      const finishReason = candidate?.finishReason || "STOP";
      const isTruncated = finishReason === "MAX_TOKENS";
      const latencyMs = Date.now() - startTime;

      if (!text) {
        throw new ApiError(502, "Gemini model returned an empty response.");
      }

      if (options.includeMetadata) {
        return {
          text,
          latencyMs,
          finishReason,
          isTruncated,
          usage: data.usageMetadata || null,
          hyperparameters: { temperature, top_p, max_tokens }
        };
      }

      return text;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        502,
        `Gemini failed to generate response: ${error.message}`,
        [error.message]
      );
    }
  }

  /**
   * Streams token responses from Google Gemini via SSE with standardized hyperparameters.
   */
  async streamResponse(modelId, promptOrMessages, onChunk, options = {}) {
    if (!env.GEMINI_API_KEY) {
      throw new ApiError(500, "GEMINI_API_KEY is not configured in backend environment.");
    }

    const startTime = Date.now();
    try {
      const normalizedModel = this._normalizeModelId(modelId);
      const { contents, systemInstruction } = this._formatContents(promptOrMessages);

      const temperature = options.temperature ?? ARENA_HYPERPARAMETERS.temperature;
      const top_p = options.top_p ?? ARENA_HYPERPARAMETERS.top_p;
      const max_tokens = Math.max(options.max_tokens ?? ARENA_HYPERPARAMETERS.max_tokens, 2048);

      const bodyPayload = {
        contents,
        generationConfig: {
          temperature,
          topP: top_p,
          maxOutputTokens: max_tokens
        }
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = systemInstruction;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/${normalizedModel}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload)
        });

        if (response.ok || (response.status !== 503 && response.status !== 429)) {
          break;
        }

        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 600 * attempt));
        }
      }


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let rawMsg = errorData.error?.message || `HTTP error! Status: ${response.status}`;
        if (response.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('rate')) {
          rawMsg = `Gemini free quota / rate limit reached for ${normalizedModel} (Google free tier limit reached). Please try Groq models or wait a moment.`;
        }
        throw new ApiError(
          502,
          `Gemini API streaming failure: ${rawMsg}`
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
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const candidate = json.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              const chunk = parts.map(p => p.text || '').join('');

              if (candidate?.finishReason) {
                finishReason = candidate.finishReason;
              }

              if (chunk) {
                fullText += chunk;
                if (typeof onChunk === 'function') onChunk(chunk);
              }
            } catch (e) {
              // ignore partial chunk JSON parse errors
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      const isTruncated = finishReason === "MAX_TOKENS";

      if (options.includeMetadata) {
        return {
          text: fullText,
          latencyMs,
          finishReason: finishReason || "STOP",
          isTruncated,
          hyperparameters: { temperature, top_p, max_tokens }
        };
      }

      return fullText;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Gemini streaming error: ${error.message}`);
    }
  }
}
