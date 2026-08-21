import { BaseProvider } from './baseProvider.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

export class OpenRouterProvider extends BaseProvider {
  async generateResponse(modelId, promptOrMessages) {
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

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
          max_tokens: 512
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

  async streamResponse(modelId, promptOrMessages, onChunk) {
    try {
      const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : [{ role: "user", content: promptOrMessages }];

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
          max_tokens: 512
        })
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
              const chunk = json.choices?.[0]?.delta?.content || "";
              if (chunk) {
                fullText += chunk;
                onChunk(chunk);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }

      return fullText;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, `Streaming error: ${error.message}`);
    }
  }
}
