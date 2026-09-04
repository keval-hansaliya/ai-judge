import { useState, useMemo } from 'react';

/**
 * Strips all internal thinking/reasoning tags (<think>...</think>, <thought>...</thought>,
 * or any unclosed thinking process) so users and judges only see the final response.
 */
function cleanResponseText(rawText) {
  if (!rawText) return '';

  // 1. Strip complete <think>...</think> or <thought>...</thought> tags
  let cleaned = rawText
    .replace(/^\s*<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>\s*/gi, '')
    .replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, '');

  // 2. If the model is mid-stream or hit token limit while thinking, strip any unclosed thinking tag
  cleaned = cleaned.replace(/^\s*<(?:think|thought)>[\s\S]*/gi, '');

  return cleaned.trim();
}

/**
 * Lightweight, zero-dependency Markdown parser that formats headings,
 * lists, bold, inline code, and fenced code blocks with Copy buttons.
 */
function MarkdownRenderer({ content }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const elements = useMemo(() => {
    if (!content) return null;

    // Split content by fenced code blocks (```lang ... ```)
    const segments = content.split(/(```[\s\S]*?```)/g);

    return segments.map((segment, segIdx) => {
      // 1. Render Fenced Code Block
      if (segment.startsWith('```') && segment.endsWith('```')) {
        const raw = segment.slice(3, -3);
        const firstNewline = raw.indexOf('\n');
        let lang = 'code';
        let code = raw;

        if (firstNewline !== -1) {
          const possibleLang = raw.slice(0, firstNewline).trim();
          if (/^[a-zA-Z0-9_-]+$/.test(possibleLang)) {
            lang = possibleLang;
            code = raw.slice(firstNewline + 1);
          }
        }

        return (
          <div key={`code_${segIdx}`} className="code-block-wrapper">
            <div className="code-block-header">
              <span className="code-lang-tag">{lang}</span>
              <button
                type="button"
                className="code-copy-btn"
                onClick={() => handleCopyCode(code.trim(), segIdx)}
              >
                {copiedIndex === segIdx ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <pre className="code-pre">
              <code>{code.trim()}</code>
            </pre>
          </div>
        );
      }

      // 2. Render Text Blocks (headings, lists, bold, inline code)
      const lines = segment.split('\n');
      return (
        <div key={`text_${segIdx}`} className="text-segment">
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={lineIdx} style={{ height: '8px' }} />;
            }

            // Headings
            if (line.startsWith('### ')) {
              return <h4 key={lineIdx}>{parseInline(line.slice(4))}</h4>;
            }
            if (line.startsWith('## ')) {
              return <h3 key={lineIdx}>{parseInline(line.slice(3))}</h3>;
            }
            if (line.startsWith('# ')) {
              return <h2 key={lineIdx}>{parseInline(line.slice(2))}</h2>;
            }

            // Unordered List Items
            if (/^[-*•]\s+/.test(trimmed)) {
              return (
                <div key={lineIdx} className="md-list-item">
                  <span className="md-bullet">•</span>
                  <span>{parseInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
                </div>
              );
            }

            // Numbered List Items
            const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
            if (numMatch) {
              return (
                <div key={lineIdx} className="md-list-item">
                  <span className="md-num">{numMatch[1]}.</span>
                  <span>{parseInline(numMatch[2])}</span>
                </div>
              );
            }

            // Standard Paragraph Line
            return (
              <p key={lineIdx} className="md-paragraph">
                {parseInline(line)}
              </p>
            );
          })}
        </div>
      );
    });
  }, [content, copiedIndex]);

  return <div className="markdown-body">{elements}</div>;
}

/**
 * Parses inline formatting: **bold**, *italic*, and `code`
 */
function parseInline(text) {
  if (!text) return null;

  // Split by inline code `...`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={pIdx} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Parse **bold** within regular text
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
        return <strong key={`${pIdx}_${bIdx}`}>{bPart.slice(2, -2)}</strong>;
      }
      return bPart;
    });
  });
}

export function FormattedResponse({ text, isStreaming = false }) {
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const cleanedText = cleanResponseText(text);

  // If text only contained <think> and was stripped to empty while streaming
  if (!cleanedText) {
    if (isStreaming) {
      return (
        <div className="streaming-state">
          <span className="pulse-spinner"></span>
          <span className="streaming-indicator">⚡ Generating response...</span>
        </div>
      );
    }
    return null;
  }

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(cleanedText);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  return (
    <div className="formatted-response-container">
      {/* Formatted Markdown Content */}
      <MarkdownRenderer content={cleanedText} />

      {isStreaming && (
        <span className="streaming-inline-cursor"> ●</span>
      )}

      {/* Clean Copy Button at Bottom */}
      {!isStreaming && (
        <div className="answer-footer-toolkit">
          <button
            type="button"
            className="answer-copy-btn"
            onClick={handleCopyAnswer}
            title="Copy response"
          >
            {copiedAnswer ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
