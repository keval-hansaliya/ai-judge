import { useState } from 'react';
import { getModelRecommendation } from '../api.js';
import { addToast } from './Toast.jsx';

// Quick starter presets for instant testing
const WORKLOAD_PRESETS = [
  {
    icon: '⚡',
    label: 'Real-time JSON Extraction',
    priority: 'speed',
    text: 'Ultra-low latency extraction of structured JSON from unstructured invoices and emails (<300ms latency requirement).'
  },
  {
    icon: '💻',
    label: 'Python Code Refactoring',
    priority: 'quality',
    text: 'Analyze complex Python repositories, identify edge-case concurrency bugs, and generate robust unit tests.'
  },
  {
    icon: '📐',
    label: 'Formal Math & Proofs',
    priority: 'quality',
    text: 'Solve multi-step university-level calculus, linear algebra, and formal mathematical proofs with rigorous Chain-of-Thought.'
  },
  {
    icon: '🧠',
    label: 'Logic & Deductive Puzzles',
    priority: 'balanced',
    text: 'Evaluate riddle arguments, detect logical fallacies, and solve complex lateral reasoning puzzles.'
  },
  {
    icon: '🎨',
    label: 'Nuanced Creative Writing',
    priority: 'balanced',
    text: 'Draft immersive science fiction stories with believable dialogue, vivid worldbuilding, and distinct character voices.'
  },
  {
    icon: '📄',
    label: 'Long Document Synthesis',
    priority: 'quality',
    text: 'Analyze 100K+ token technical whitepapers and legal contracts, synthesizing key liabilities and obligations.'
  }
];

const PRIORITY_OPTIONS = [
  { id: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Optimal Quality & Speed' },
  { id: 'quality', label: 'Peak Elo', icon: '👑', desc: 'Maximum Capability' },
  { id: 'speed', label: 'Ultra Speed', icon: '⚡', desc: 'Lowest Latency (<300ms)' },
  { id: 'cost', label: 'Budget / Free', icon: '💰', desc: 'Maximum Efficiency' }
];

export function ModelMatchmaker({ onHighlightModel, onNavigate }) {
  const [useCase, setUseCase] = useState('');
  const [priority, setPriority] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);

  const handlePresetClick = (preset) => {
    setUseCase(preset.text);
    if (preset.priority) {
      setPriority(preset.priority);
    }
  };

  const handleRecommend = async (e) => {
    if (e) e.preventDefault();
    if (!useCase.trim()) {
      addToast('Please enter your workload or use case description first.', 'warning');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getModelRecommendation(useCase.trim(), priority);
      setRecommendation(data);
      addToast(`✨ Matchmaker found top model: ${data.primaryRecommendation?.modelName}`, 'success');
    } catch (err) {
      setError(err.message || 'Failed to generate recommendation. Please try again.');
      addToast('Error analyzing workload: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRecommendation(null);
    setError(null);
  };

  const handleHighlight = (recItem) => {
    if (onHighlightModel) {
      onHighlightModel(recItem.databaseId, recItem.modelId, recItem.modelName);
    }
  };

  const handleTestInArena = () => {
    if (onNavigate) {
      onNavigate('arena', {
        prompt: useCase.trim(),
        category: recommendation?.domain || 'General'
      });
      addToast('Switched to Arena Battle with preloaded workload prompt!', 'info');
    }
  };

  const handleOpenPlayground = (modelId) => {
    if (onNavigate) {
      onNavigate('playground', {
        modelId,
        prompt: useCase.trim()
      });
      addToast('Opened model in Named Playground lab!', 'info');
    }
  };

  return (
    <div className="matchmaker-container">
      {/* ── Matchmaker Header Deck ── */}
      <div className="matchmaker-header">
        <div className="matchmaker-badge">
          <span className="matchmaker-pulse-dot"></span>
          <span>AI MODEL MATCHMAKER • WORKLOAD ADVISOR</span>
        </div>
        <h3 className="matchmaker-title">
          Find the Ideal Model for Your <span className="gradient-text">Exact Use Case</span>
        </h3>
        <p className="matchmaker-subtitle">
          Describe your task, latency target, or prompt. Our engine correlates real-time Arena Elo,
          inference throughput, and architectural strengths to select the optimal model.
        </p>
      </div>

      {/* ── Quick Starter Presets ── */}
      <div className="matchmaker-presets-strip">
        <span className="presets-label">Workload Presets:</span>
        <div className="presets-scroll-track">
          {WORKLOAD_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => handlePresetClick(p)}
              disabled={loading}
              title={p.text}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Input Box & Priority Selectors ── */}
      <form className="matchmaker-form" onSubmit={handleRecommend}>
        <div className="matchmaker-input-wrapper">
          <textarea
            className="matchmaker-textarea"
            rows="3"
            placeholder="e.g. I am building a customer support triage agent that needs to parse messy user complaints into JSON with strict accuracy and sub-500ms latency..."
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            disabled={loading}
          />
          <div className="matchmaker-textarea-footer">
            <span className="char-count">{useCase.length} characters</span>
            {useCase && (
              <button
                type="button"
                className="clear-input-btn"
                onClick={() => setUseCase('')}
                disabled={loading}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Priority Controls Bar */}
        <div className="matchmaker-controls-row">
          <div className="priority-selector-group">
            <span className="control-label">Optimization Goal:</span>
            <div className="priority-pill-cluster">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`priority-pill ${priority === opt.id ? 'active' : ''}`}
                  onClick={() => setPriority(opt.id)}
                  disabled={loading}
                  title={opt.desc}
                >
                  <span className="priority-icon">{opt.icon}</span>
                  <span className="priority-name">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="matchmaker-submit-cluster">
            {recommendation && (
              <button
                type="button"
                className="matchmaker-reset-btn"
                onClick={handleClear}
                disabled={loading}
              >
                Reset Results
              </button>
            )}

            <button
              type="submit"
              className="matchmaker-submit-btn"
              disabled={loading || !useCase.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Analyzing Matrix...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Find Best Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── Error Notice ── */}
      {error && (
        <div className="matchmaker-error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Recommendation Showcase Card ── */}
      {recommendation && (
        <div className="matchmaker-results-showcase">
          {/* Workload Profile Banner */}
          <div className="results-profile-header">
            <div className="profile-domain-pill">
              <span className="domain-icon">
                {recommendation.domain === 'Coding' && '💻'}
                {recommendation.domain === 'Math' && '📐'}
                {recommendation.domain === 'Reasoning' && '🧠'}
                {recommendation.domain === 'Creative' && '🎨'}
                {recommendation.domain === 'General' && '🌐'}
              </span>
              <span>{recommendation.domain} Workload Profile</span>
            </div>
            <p className="profile-analysis-text">
              {recommendation.analysis}
            </p>
          </div>

          {/* 3-Tier Recommendation Cards Grid */}
          <div className="recommendations-grid">
            {/* 1. Primary Champion Pick */}
            {recommendation.primaryRecommendation && (
              <div className="rec-card rec-primary-card">
                <div className="rec-card-crown-stripe">
                  <span className="crown-badge">👑 PRIMARY RECOMMENDATION</span>
                  {recommendation.primaryRecommendation.matchScore && (
                    <span className="match-score-badge">
                      {recommendation.primaryRecommendation.matchScore}% Match
                    </span>
                  )}
                </div>

                <div className="rec-header-row">
                  <div>
                    <h4 className="rec-model-name">
                      {recommendation.primaryRecommendation.modelName}
                    </h4>
                    <div className="rec-tags-strip">
                      <span className="rec-provider-tag">
                        {recommendation.primaryRecommendation.provider || 'Verified AI'}
                      </span>
                      {recommendation.primaryRecommendation.contextWindow && (
                        <span className="rec-context-tag">
                          📚 {recommendation.primaryRecommendation.contextWindow} Context
                        </span>
                      )}
                      {recommendation.primaryRecommendation.elo && (
                        <span className="rec-elo-tag">
                          ⚡ Elo {recommendation.primaryRecommendation.elo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rec-ribbon-pill">
                    {recommendation.primaryRecommendation.badge || 'Optimal Pick'}
                  </div>
                </div>

                <div className="rec-body-content">
                  <div className="rec-reasoning-box">
                    <strong>Why this model:</strong> {recommendation.primaryRecommendation.reasoning}
                  </div>

                  {recommendation.primaryRecommendation.strengthsHighlight?.length > 0 && (
                    <div className="rec-strengths-row">
                      <span className="strengths-label">Key Strengths:</span>
                      <div className="strengths-tags">
                        {recommendation.primaryRecommendation.strengthsHighlight.map((s, idx) => (
                          <span key={idx} className="strength-chip">✓ {s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recommendation.primaryRecommendation.tradeoff && (
                    <div className="rec-tradeoff-notice">
                      <span className="tradeoff-icon">ℹ️</span>
                      <span><strong>Trade-off:</strong> {recommendation.primaryRecommendation.tradeoff}</span>
                    </div>
                  )}
                </div>

                {/* Primary Card CTAs */}
                <div className="rec-card-actions">
                  <button
                    type="button"
                    className="rec-action-btn btn-highlight"
                    onClick={() => handleHighlight(recommendation.primaryRecommendation)}
                    title="Highlight model in standings table below"
                  >
                    <span>🎯</span>
                    <span>View in Standings</span>
                  </button>
                  <button
                    type="button"
                    className="rec-action-btn btn-arena"
                    onClick={handleTestInArena}
                    title="Launch Arena battle with this workload"
                  >
                    <span>⚔️</span>
                    <span>Test in Arena</span>
                  </button>
                  <button
                    type="button"
                    className="rec-action-btn btn-playground"
                    onClick={() => handleOpenPlayground(recommendation.primaryRecommendation.modelId)}
                    title="Open directly in playground lab"
                  >
                    <span>🧪</span>
                    <span>Playground Lab</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Speed Demon Card */}
            {recommendation.speedRecommendation && (
              <div className="rec-card rec-secondary-card rec-speed-card">
                <div className="rec-card-crown-stripe secondary-stripe">
                  <span className="speed-crown-badge">⚡ ULTRA SPEED DEMON</span>
                  <span className="secondary-tag-pill">High TPS</span>
                </div>

                <h4 className="rec-model-name">
                  {recommendation.speedRecommendation.modelName}
                </h4>

                <div className="rec-tags-strip">
                  <span className="rec-provider-tag provider-groq">Groq LPU Engine</span>
                  {recommendation.speedRecommendation.elo && (
                    <span className="rec-elo-tag">Elo {recommendation.speedRecommendation.elo}</span>
                  )}
                </div>

                <p className="secondary-reason-text">
                  {recommendation.speedRecommendation.reasoning}
                </p>

                <div className="secondary-actions-row">
                  <button
                    type="button"
                    className="secondary-btn btn-view"
                    onClick={() => handleHighlight(recommendation.speedRecommendation)}
                  >
                    <span>🎯</span> Standings
                  </button>
                  <button
                    type="button"
                    className="secondary-btn btn-test"
                    onClick={() => handleOpenPlayground(recommendation.speedRecommendation.modelId)}
                  >
                    <span>🧪</span> Playground
                  </button>
                </div>
              </div>
            )}

            {/* 3. Value / Efficiency Card */}
            {recommendation.valueRecommendation && (
              <div className="rec-card rec-secondary-card rec-value-card">
                <div className="rec-card-crown-stripe secondary-stripe">
                  <span className="value-crown-badge">💰 EFFICIENCY & VALUE</span>
                  <span className="secondary-tag-pill">High ROI</span>
                </div>

                <h4 className="rec-model-name">
                  {recommendation.valueRecommendation.modelName}
                </h4>

                <div className="rec-tags-strip">
                  <span className="rec-provider-tag provider-value">Cost-Optimized</span>
                  {recommendation.valueRecommendation.elo && (
                    <span className="rec-elo-tag">Elo {recommendation.valueRecommendation.elo}</span>
                  )}
                </div>

                <p className="secondary-reason-text">
                  {recommendation.valueRecommendation.reasoning}
                </p>

                <div className="secondary-actions-row">
                  <button
                    type="button"
                    className="secondary-btn btn-view"
                    onClick={() => handleHighlight(recommendation.valueRecommendation)}
                  >
                    <span>🎯</span> Standings
                  </button>
                  <button
                    type="button"
                    className="secondary-btn btn-test"
                    onClick={() => handleOpenPlayground(recommendation.valueRecommendation.modelId)}
                  >
                    <span>🧪</span> Playground
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Architecture & Prompting Tip Box */}
          {recommendation.keyEngineeringTip && (
            <div className="matchmaker-pro-tip">
              <span className="tip-icon">💡</span>
              <div className="tip-body">
                <strong>Architectural Recommendation:</strong> {recommendation.keyEngineeringTip}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
