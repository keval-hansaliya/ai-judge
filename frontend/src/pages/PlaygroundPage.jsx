import { useState, useEffect } from 'react';
import { createBattleStream } from '../api.js';
import { FormattedResponse } from '../components/FormattedResponse.jsx';
import { addToast } from '../components/Toast.jsx';
import { AVAILABLE_MODELS, RANDOM_PROMPTS, PROVIDER_META } from '../constants.js';
import './PlaygroundPage.css';

/**
 * Curated benchmark starter prompts for immediate side-by-side testing.
 */
const PLAYGROUND_STARTERS = [
  {
    label: '⚖️ Recursion vs Iteration',
    prompt: 'Compare recursion and iteration in computer science. Analyze memory overhead, call stack limits, and performance tradeoffs with concise Python code examples.',
  },
  {
    label: '⚡ Rust vs Go Concurrency',
    prompt: 'Compare concurrency paradigms between Rust (async/await, tokio, ownership) and Go (goroutines, channels). Which is better suited for high-throughput cloud microservices and why?',
  },
  {
    label: '🧠 Quantum Computing 101',
    prompt: 'Explain quantum superposition and quantum entanglement to a high school senior interested in physics. Use clear, intuitive real-world analogies without mathematical jargon.',
  },
  {
    label: '🎨 Satirical Tech Press Release',
    prompt: 'Write a hilarious, satirical Silicon Valley press release announcing "AI-Powered Organic Water 2.0" featuring blockchain hydration tracking and neural electrolyte delivery.',
  },
];

/**
 * PlaygroundPage — Multi-Provider Model Playground & Parameter Lab.
 *
 * Allows users to explicitly select models across Groq, Google Gemini, and OpenRouter,
 * inspect architecture specifications and context limits, calibrate hyperparameters,
 * and stream synchronized side-by-side evaluations.
 */
export function PlaygroundPage({ initialModelId = '', initialPrompt = '' }) {
  const [pgModelA, setPgModelA] = useState(() => {
    if (initialModelId && AVAILABLE_MODELS.some((m) => m.id === initialModelId)) {
      return initialModelId;
    }
    return AVAILABLE_MODELS[0]?.id || '';
  });
  const [pgModelB, setPgModelB] = useState(AVAILABLE_MODELS[4]?.id || AVAILABLE_MODELS[1]?.id || '');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [pgPrompt, setPgPrompt] = useState(initialPrompt || '');
  const [pgResA, setPgResA] = useState('');
  const [pgResB, setPgResB] = useState('');
  const [pgStreaming, setPgStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialModelId && AVAILABLE_MODELS.some((m) => m.id === initialModelId)) {
      setPgModelA(initialModelId);
    }
    if (initialPrompt) {
      setPgPrompt(initialPrompt);
    }
  }, [initialModelId, initialPrompt]);

  const modelAObj = AVAILABLE_MODELS.find((m) => m.id === pgModelA) || {
    id: pgModelA,
    name: 'Model A',
    provider: 'Groq',
  };
  const modelBObj = AVAILABLE_MODELS.find((m) => m.id === pgModelB) || {
    id: pgModelB,
    name: 'Model B',
    provider: 'Google',
  };

  // Grouped models for structured provider selection
  const groqModels = AVAILABLE_MODELS.filter((m) => m.provider === 'Groq');
  const geminiModels = AVAILABLE_MODELS.filter((m) => m.provider === 'Google');
  const openRouterModels = AVAILABLE_MODELS.filter((m) => m.provider === 'OpenRouter');

  // Metrics calculation
  const getMetrics = (text) => {
    if (!text) return { words: 0, readTimeSec: 0 };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readTimeSec = Math.max(1, Math.round((words / 200) * 60));
    return { words, readTimeSec };
  };

  const metricsA = getMetrics(pgResA);
  const metricsB = getMetrics(pgResB);
  const promptWordCount = pgPrompt.trim() ? pgPrompt.trim().split(/\s+/).filter(Boolean).length : 0;
  const promptCharCount = pgPrompt.length;

  const handleStartPlayground = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pgPrompt.trim() || pgStreaming) return;

    setPgStreaming(true);
    setPgResA('');
    setPgResB('');
    setError(null);

    try {
      await createBattleStream(
        pgPrompt.trim(),
        'General',
        (chunk) => setPgResA((prev) => prev + chunk),
        (chunk) => setPgResB((prev) => prev + chunk),
        () => setPgStreaming(false),
        (err) => {
          setError(err.message);
          setPgStreaming(false);
        },
        {
          modelAId: pgModelA,
          modelBId: pgModelB,
          options: { temperature, max_tokens: maxTokens },
        }
      );
    } catch (err) {
      setError(err.message || 'Playground streaming failed');
      setPgStreaming(false);
    }
  };

  const handleSwapModels = () => {
    if (pgStreaming) return;
    setPgModelA(pgModelB);
    setPgModelB(pgModelA);
    setPgResA(pgResB);
    setPgResB(pgResA);
    addToast('⇄ Swapped Model A and Model B!', 'info');
  };

  const handleLoadStarter = (text) => {
    if (pgStreaming) return;
    setPgPrompt(text);
    addToast('Loaded starter benchmark prompt!', 'info');
  };

  const handleRandomPrompt = () => {
    if (pgStreaming) return;
    const allPrompts = Object.values(RANDOM_PROMPTS).flat();
    const randomPick = allPrompts[Math.floor(Math.random() * allPrompts.length)];
    setPgPrompt(randomPick);
    addToast('🎲 Loaded random challenge prompt!', 'info');
  };

  const handleClearAll = () => {
    if (pgStreaming) return;
    setPgPrompt('');
    setPgResA('');
    setPgResB('');
    setError(null);
    addToast('Playground cleared', 'info');
  };

  const handleCopy = (text, modelName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`📋 Copied ${modelName} response to clipboard!`, 'info');
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (pgPrompt.trim() && !pgStreaming) {
        handleStartPlayground();
      }
    }
  };

  const renderModelOptions = () => (
    <>
      <optgroup label="⚡ Groq LPUs (Ultra-Fast)">
        {groqModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="♊ Google AI (DeepMind)">
        {geminiModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="🌐 OpenRouter Verified Models">
        {openRouterModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </optgroup>
    </>
  );

  return (
    <div className="playground-page-container">
      {/* ── 1. Playground Hero Cockpit ── */}
      <div className="playground-hero-card">
        <div className="playground-badge">
          <span className="live-dot"></span>
          <span>MULTI-PROVIDER MODEL COMPARISON LAB</span>
        </div>
        <h2 className="playground-hero-title">
          Named Model Playground <span className="gradient-text">&amp; Parameter Lab</span>
        </h2>
        <p className="playground-hero-subtitle">
          Pit models head-to-head across Groq, Google DeepMind, and OpenRouter. Compare latency, architectural styles, and output quality in real time.
        </p>

        {/* Live Parameter Quick-Glance Bar */}
        <div className="playground-live-params-bar">
          <div className="param-summary-pill a-pill">
            <span className="pill-dot a-dot"></span>
            <span className="pill-label">Model A:</span>
            <span className="pill-val">{modelAObj.name}</span>
          </div>
          <div className="param-summary-pill b-pill">
            <span className="pill-dot b-dot"></span>
            <span className="pill-label">Model B:</span>
            <span className="pill-val">{modelBObj.name}</span>
          </div>
          <div className="param-summary-pill temp-pill">
            <span>🌡️ Temp: <strong>{temperature.toFixed(1)}</strong></span>
          </div>
          <div className="param-summary-pill tokens-pill">
            <span>📏 Max Tokens: <strong>{maxTokens}</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. Model Selection Dual Cockpit with Spec Sheets ── */}
      <div className="model-cockpit-deck">
        {/* Model A Card */}
        <div className="model-cockpit-card model-a-cockpit">
          <div className="cockpit-card-header">
            <div className="cockpit-header-left">
              <span className="cockpit-badge badge-a">MODEL A COMPETITOR</span>
              <span
                className="cockpit-provider-tag"
                style={{
                  color: PROVIDER_META[modelAObj.provider]?.color || '#a855f7',
                  backgroundColor: PROVIDER_META[modelAObj.provider]?.bgColor || 'rgba(168, 85, 247, 0.15)',
                  borderColor: PROVIDER_META[modelAObj.provider]?.borderColor || 'rgba(168, 85, 247, 0.35)',
                }}
              >
                {PROVIDER_META[modelAObj.provider]?.icon || '🌐'} {PROVIDER_META[modelAObj.provider]?.name || modelAObj.provider}
              </span>
            </div>
            <span className="cockpit-accent-indicator dot-a"></span>
          </div>

          <div className="cockpit-card-body">
            <label className="cockpit-label" htmlFor="select-model-a">
              Select Competitor Alpha:
            </label>
            <select
              id="select-model-a"
              className="cockpit-dropdown dropdown-a"
              value={pgModelA}
              onChange={(e) => setPgModelA(e.target.value)}
              disabled={pgStreaming}
            >
              {renderModelOptions()}
            </select>

            {/* Model Architecture Spec Sheet */}
            <div className="model-spec-sheet">
              <div className="spec-meta-row">
                <span className="spec-context-badge">
                  🧠 Context: <strong>{modelAObj.contextWindow || '32K'}</strong>
                </span>
                <span className="spec-id-mono">{modelAObj.id}</span>
              </div>
              <p className="spec-description">{modelAObj.description}</p>
              {modelAObj.strengths && (
                <div className="spec-strengths-tags">
                  {modelAObj.strengths.map((tag, idx) => (
                    <span key={idx} className="strength-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Swap Action */}
        <div className="model-cockpit-divider">
          <button
            type="button"
            className="model-swap-btn"
            onClick={handleSwapModels}
            disabled={pgStreaming}
            title="Swap Model A and Model B"
          >
            <span className="swap-icon">⇄</span>
            <span className="swap-label">Swap</span>
          </button>
        </div>

        {/* Model B Card */}
        <div className="model-cockpit-card model-b-cockpit">
          <div className="cockpit-card-header">
            <div className="cockpit-header-left">
              <span className="cockpit-badge badge-b">MODEL B COMPETITOR</span>
              <span
                className="cockpit-provider-tag"
                style={{
                  color: PROVIDER_META[modelBObj.provider]?.color || '#a855f7',
                  backgroundColor: PROVIDER_META[modelBObj.provider]?.bgColor || 'rgba(168, 85, 247, 0.15)',
                  borderColor: PROVIDER_META[modelBObj.provider]?.borderColor || 'rgba(168, 85, 247, 0.35)',
                }}
              >
                {PROVIDER_META[modelBObj.provider]?.icon || '🌐'} {PROVIDER_META[modelBObj.provider]?.name || modelBObj.provider}
              </span>
            </div>
            <span className="cockpit-accent-indicator dot-b"></span>
          </div>

          <div className="cockpit-card-body">
            <label className="cockpit-label" htmlFor="select-model-b">
              Select Competitor Beta:
            </label>
            <select
              id="select-model-b"
              className="cockpit-dropdown dropdown-b"
              value={pgModelB}
              onChange={(e) => setPgModelB(e.target.value)}
              disabled={pgStreaming}
            >
              {renderModelOptions()}
            </select>

            {/* Model Architecture Spec Sheet */}
            <div className="model-spec-sheet">
              <div className="spec-meta-row">
                <span className="spec-context-badge">
                  🧠 Context: <strong>{modelBObj.contextWindow || '32K'}</strong>
                </span>
                <span className="spec-id-mono">{modelBObj.id}</span>
              </div>
              <p className="spec-description">{modelBObj.description}</p>
              {modelBObj.strengths && (
                <div className="spec-strengths-tags">
                  {modelBObj.strengths.map((tag, idx) => (
                    <span key={idx} className="strength-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Hyperparameter Tuning Deck ── */}
      <div className="tuning-deck-card">
        <div className="tuning-deck-header">
          <div className="tuning-deck-title-row">
            <span className="tuning-deck-badge">🎛️ HYPERPARAMETER LAB</span>
            <span className="tuning-deck-subtext">Calibrate generation parameters applied simultaneously to both models</span>
          </div>
        </div>

        <div className="tuning-deck-grid">
          {/* Temperature Slider & Presets */}
          <div className="tuning-item-card">
            <div className="tuning-item-header">
              <div className="tuning-item-title-wrap">
                <span className="tuning-icon">🌡️</span>
                <div>
                  <div className="tuning-title">Temperature</div>
                  <div className="tuning-caption">Creativity vs strict determinism</div>
                </div>
              </div>
              <div className="tuning-value-pill temp-val-pill">
                {temperature.toFixed(1)}
              </div>
            </div>

            <div className="tuning-slider-container">
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                disabled={pgStreaming}
                className="custom-range-slider temp-slider"
              />
              <div className="slider-ticks">
                <span>0.0 (Deterministic)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div className="preset-buttons-row">
              <span className="preset-label">Presets:</span>
              <button
                type="button"
                className={`preset-pill ${temperature === 0.0 ? 'active' : ''}`}
                onClick={() => setTemperature(0.0)}
                disabled={pgStreaming}
              >
                🎯 Precise 0.0
              </button>
              <button
                type="button"
                className={`preset-pill ${temperature === 0.7 ? 'active' : ''}`}
                onClick={() => setTemperature(0.7)}
                disabled={pgStreaming}
              >
                ⚖️ Balanced 0.7
              </button>
              <button
                type="button"
                className={`preset-pill ${temperature === 1.0 ? 'active' : ''}`}
                onClick={() => setTemperature(1.0)}
                disabled={pgStreaming}
              >
                🎨 Creative 1.0
              </button>
            </div>
          </div>

          {/* Max Tokens Slider & Presets */}
          <div className="tuning-item-card">
            <div className="tuning-item-header">
              <div className="tuning-item-title-wrap">
                <span className="tuning-icon">📏</span>
                <div>
                  <div className="tuning-title">Max Tokens</div>
                  <div className="tuning-caption">Upper response limit (~{Math.round(maxTokens * 0.75)} words)</div>
                </div>
              </div>
              <div className="tuning-value-pill tokens-val-pill">
                {maxTokens} tok
              </div>
            </div>

            <div className="tuning-slider-container">
              <input
                type="range"
                min="128"
                max="1024"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                disabled={pgStreaming}
                className="custom-range-slider tokens-slider"
              />
              <div className="slider-ticks">
                <span>128 (Concise)</span>
                <span>512 (Standard)</span>
                <span>1024 (Deep)</span>
              </div>
            </div>

            <div className="preset-buttons-row">
              <span className="preset-label">Presets:</span>
              <button
                type="button"
                className={`preset-pill ${maxTokens === 256 ? 'active' : ''}`}
                onClick={() => setMaxTokens(256)}
                disabled={pgStreaming}
              >
                ⚡ Quick 256
              </button>
              <button
                type="button"
                className={`preset-pill ${maxTokens === 512 ? 'active' : ''}`}
                onClick={() => setMaxTokens(512)}
                disabled={pgStreaming}
              >
                📄 Standard 512
              </button>
              <button
                type="button"
                className={`preset-pill ${maxTokens === 1024 ? 'active' : ''}`}
                onClick={() => setMaxTokens(1024)}
                disabled={pgStreaming}
              >
                📚 Deep 1024
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Prompt Deck & Starter Prompts ── */}
      <div className="playground-prompt-section">
        {/* Starter Prompts Bar */}
        <div className="playground-starters-card">
          <div className="starters-header">
            <span className="starters-title">💡 CURATED BENCHMARK PROMPTS:</span>
            <span className="starters-hint">Click any starter to load instant comparison</span>
          </div>
          <div className="starters-chips-row">
            {PLAYGROUND_STARTERS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="starter-chip"
                onClick={() => handleLoadStarter(s.prompt)}
                disabled={pgStreaming}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input Card */}
        <form onSubmit={handleStartPlayground} className="playground-form-card">
          <div className="prompt-form-header">
            <div className="prompt-header-left">
              <span className="prompt-badge">💬 INPUT COMPARISON PROMPT</span>
              <span className="prompt-shortcut-hint">
                Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to stream
              </span>
            </div>
            <div className="prompt-metrics-badge">
              <span>{promptWordCount} words</span>
              <span className="divider">•</span>
              <span>{promptCharCount} chars</span>
            </div>
          </div>

          <div className="prompt-input-wrapper">
            <textarea
              id="pg-prompt-input"
              className="prompt-textarea playground-textarea"
              placeholder="e.g. Compare recursion vs iteration in terms of time and space complexity with concise Python examples..."
              value={pgPrompt}
              onChange={(e) => setPgPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              disabled={pgStreaming}
            />
          </div>

          <div className="playground-actions-bar">
            <div className="actions-bar-left">
              <button
                type="button"
                className="pg-action-btn random-btn"
                onClick={handleRandomPrompt}
                disabled={pgStreaming}
              >
                🎲 Random Prompt
              </button>
              {(pgPrompt || pgResA || pgResB) && (
                <button
                  type="button"
                  className="pg-action-btn clear-btn"
                  onClick={handleClearAll}
                  disabled={pgStreaming}
                >
                  🧹 Clear All
                </button>
              )}
            </div>

            <button
              type="submit"
              className="playground-submit-btn"
              disabled={!pgPrompt.trim() || pgStreaming}
            >
              {pgStreaming ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Streaming Both Models...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Stream Side-by-Side Comparison</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── 5. Error Alert ── */}
      {error && (
        <div className="playground-error-card">
          <span className="error-icon">⚠️</span>
          <div className="error-body">
            <strong>Stream Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── 6. Side-by-Side Response Panels with VS Badge ── */}
      {(pgResA || pgResB || pgStreaming) && (
        <div className="battle-grid-wrapper playground-results-wrapper">
          <div className="battle-grid">
            {/* Model A Response Panel */}
            <div className="response-panel model-a-panel">
              <div className="panel-header">
                <div className="panel-title-wrap">
                  <div className="panel-avatar-badge avatar-a">
                    {PROVIDER_META[modelAObj.provider]?.icon || '🔵'}
                  </div>
                  <div className="panel-text-block">
                    <div className="panel-title-row">
                      <span className="panel-title">{modelAObj.name}</span>
                      <span className="panel-role-pill pill-a">MODEL A</span>
                      <span
                        className="panel-provider-tag"
                        style={{
                          color: PROVIDER_META[modelAObj.provider]?.color || '#a855f7',
                          backgroundColor: PROVIDER_META[modelAObj.provider]?.bgColor || 'rgba(168, 85, 247, 0.15)',
                          borderColor: PROVIDER_META[modelAObj.provider]?.borderColor || 'rgba(168, 85, 247, 0.35)',
                        }}
                      >
                        {PROVIDER_META[modelAObj.provider]?.icon} {modelAObj.provider}
                      </span>
                    </div>
                    <span className="panel-role-subtitle">{modelAObj.id}</span>
                  </div>
                </div>

                <div className="panel-header-right">
                  {pgStreaming ? (
                    <div className="live-status-badge">
                      <span className="status-streaming">
                        <span className="pulse-indicator"></span> Streaming
                      </span>
                    </div>
                  ) : pgResA ? (
                    <div className="panel-meta-actions">
                      <span className="status-ready">
                        ✓ {metricsA.words} words · {metricsA.readTimeSec}s
                      </span>
                      <button
                        type="button"
                        className="panel-copy-btn"
                        onClick={() => handleCopy(pgResA, modelAObj.name)}
                        title="Copy Model A response"
                      >
                        📋 Copy
                      </button>
                    </div>
                  ) : (
                    <span className="status-waiting">Waiting</span>
                  )}
                </div>
              </div>

              <div className="response-content">
                <FormattedResponse text={pgResA} isStreaming={pgStreaming} />
              </div>
            </div>

            {/* Model B Response Panel */}
            <div className="response-panel model-b-panel">
              <div className="panel-header">
                <div className="panel-title-wrap">
                  <div className="panel-avatar-badge avatar-b">
                    {PROVIDER_META[modelBObj.provider]?.icon || '🟣'}
                  </div>
                  <div className="panel-text-block">
                    <div className="panel-title-row">
                      <span className="panel-title">{modelBObj.name}</span>
                      <span className="panel-role-pill pill-b">MODEL B</span>
                      <span
                        className="panel-provider-tag"
                        style={{
                          color: PROVIDER_META[modelBObj.provider]?.color || '#a855f7',
                          backgroundColor: PROVIDER_META[modelBObj.provider]?.bgColor || 'rgba(168, 85, 247, 0.15)',
                          borderColor: PROVIDER_META[modelBObj.provider]?.borderColor || 'rgba(168, 85, 247, 0.35)',
                        }}
                      >
                        {PROVIDER_META[modelBObj.provider]?.icon} {modelBObj.provider}
                      </span>
                    </div>
                    <span className="panel-role-subtitle">{modelBObj.id}</span>
                  </div>
                </div>

                <div className="panel-header-right">
                  {pgStreaming ? (
                    <div className="live-status-badge">
                      <span className="status-streaming">
                        <span className="pulse-indicator"></span> Streaming
                      </span>
                    </div>
                  ) : pgResB ? (
                    <div className="panel-meta-actions">
                      <span className="status-ready">
                        ✓ {metricsB.words} words · {metricsB.readTimeSec}s
                      </span>
                      <button
                        type="button"
                        className="panel-copy-btn"
                        onClick={() => handleCopy(pgResB, modelBObj.name)}
                        title="Copy Model B response"
                      >
                        📋 Copy
                      </button>
                    </div>
                  ) : (
                    <span className="status-waiting">Waiting</span>
                  )}
                </div>
              </div>

              <div className="response-content">
                <FormattedResponse text={pgResB} isStreaming={pgStreaming} />
              </div>
            </div>
          </div>

          {/* Centered VS Badge */}
          <div className="battle-center-vs">
            <div className="vs-badge-inner">
              <span>VS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
