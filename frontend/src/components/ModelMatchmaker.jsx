import { useState } from 'react';
import { getModelRecommendation } from '../api.js';
import { addToast } from './Toast.jsx';
import {
  Sparkles,
  Zap,
  Code2,
  Calculator,
  Brain,
  PenTool,
  FileText,
  Check,
  Info,
  Swords,
  FlaskConical,
  Target,
  RotateCcw,
  Lightbulb,
  ArrowRight,
  Gauge,
  Coins,
  ShieldCheck
} from 'lucide-react';

const WORKLOAD_PRESETS = [
  {
    icon: Zap,
    label: 'JSON Extraction',
    priority: 'speed',
    text: 'Ultra-low latency extraction of structured JSON from unstructured invoices and emails with sub-300ms SLA.'
  },
  {
    icon: Code2,
    label: 'Code Refactoring',
    priority: 'quality',
    text: 'Analyze complex repositories, detect edge-case concurrency bugs, and generate robust unit tests.'
  },
  {
    icon: Calculator,
    label: 'Math & Proofs',
    priority: 'quality',
    text: 'Solve university-level calculus, linear algebra, and formal mathematical proofs with rigorous Chain-of-Thought.'
  },
  {
    icon: Brain,
    label: 'Logic & Reasoning',
    priority: 'balanced',
    text: 'Evaluate riddle arguments, detect logical fallacies, and solve complex deductive reasoning problems.'
  },
  {
    icon: PenTool,
    label: 'Creative Writing',
    priority: 'balanced',
    text: 'Draft long-form narrative with consistent character voice, nuanced dialogue, and structured pacing.'
  },
  {
    icon: FileText,
    label: 'Long Documents',
    priority: 'quality',
    text: 'Analyze 100K+ token technical papers and agreements, synthesizing key liabilities and terms.'
  }
];

const PRIORITY_OPTIONS = [
  { id: 'balanced', label: 'Balanced', desc: 'Balanced accuracy and latency' },
  { id: 'quality', label: 'High Precision', desc: 'Highest reasoning and Elo performance' },
  { id: 'speed', label: 'Low Latency', desc: 'Fastest token streaming and high TPS' },
  { id: 'cost', label: 'Efficiency', desc: 'Cost-effective and scalable throughput' }
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
      addToast(`Selected ${data.primaryRecommendation?.modelName}`, 'success');
    } catch (err) {
      setError(err.message || 'Failed to generate recommendation. Please try again.');
      addToast('Analysis error: ' + (err.message || 'Server error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRecommendation(null);
    setError(null);
  };

  const handleHighlight = (recItem) => {
    if (onHighlightModel && recItem) {
      onHighlightModel(recItem.databaseId, recItem.modelId, recItem.modelName);
    }
  };

  const handleTestInArena = () => {
    if (onNavigate) {
      onNavigate('arena', {
        prompt: useCase.trim(),
        category: recommendation?.domain || 'General'
      });
      addToast('Workload loaded into Arena Battle', 'info');
    }
  };

  const handleOpenPlayground = (modelId) => {
    if (onNavigate) {
      onNavigate('playground', {
        modelId,
        prompt: useCase.trim()
      });
      addToast('Model loaded into Named Playground', 'info');
    }
  };

  return (
    <section className="shadcn-matchmaker-card" aria-label="Model Matchmaker">
      {/* ── Top Header ── */}
      <div className="matchmaker-header-group">
        <div className="matchmaker-badge-clean">
          <Sparkles className="icon-xs" />
          <span>Model Advisor</span>
        </div>
        <div className="matchmaker-title-block">
          <h3 className="matchmaker-heading-clean">Find the right model for your workload</h3>
          <p className="matchmaker-subheading-clean">
            Describe your task, latency target, or constraints. Models are matched using real-time
            Arena Elo benchmarks, context capacity, and throughput characteristics.
          </p>
        </div>
      </div>

      {/* ── Quick Starter Presets ── */}
      <div className="matchmaker-presets-container">
        <span className="presets-caption">Presets:</span>
        <div className="presets-pill-list">
          {WORKLOAD_PRESETS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                className="preset-pill-clean"
                onClick={() => handlePresetClick(p)}
                disabled={loading}
              >
                <Icon className="icon-xs text-muted-dim" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Textarea & Priority Bar ── */}
      <form onSubmit={handleRecommend} className="matchmaker-form-clean">
        <div className="textarea-container-clean">
          <textarea
            className="shadcn-textarea"
            rows="3"
            placeholder="e.g. Inbound support ticket triage requiring classification into strict JSON schemas with sub-400ms latency..."
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            disabled={loading}
          />
          <div className="textarea-meta-bar">
            <span className="char-count-clean">{useCase.length} characters</span>
            {useCase && (
              <button
                type="button"
                className="clear-link-clean"
                onClick={() => setUseCase('')}
                disabled={loading}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="matchmaker-action-bar">
          <div className="priority-segmented-group">
            <span className="priority-label-clean">Priority:</span>
            <div className="segmented-control">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`segmented-button ${priority === opt.id ? 'active' : ''}`}
                  onClick={() => setPriority(opt.id)}
                  disabled={loading}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="submit-group-clean">
            {recommendation && (
              <button
                type="button"
                className="btn-outline-clean"
                onClick={handleClear}
                disabled={loading}
              >
                <RotateCcw className="icon-xs" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="submit"
              className="btn-primary-clean"
              disabled={loading || !useCase.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-clean"></span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="icon-xs" />
                  <span>Recommend Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── Error Banner ── */}
      {error && (
        <div className="alert-destructive-clean">
          <Info className="icon-sm" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Recommendations Grid ── */}
      {recommendation && (
        <div className="recommendations-container-clean">
          {/* Analysis Summary Bar */}
          <div className="analysis-summary-bar">
            <div className="domain-tag-clean">
              <span>{recommendation.domain}</span>
            </div>
            <p className="analysis-summary-text">{recommendation.analysis}</p>
          </div>

          {/* Cards Grid */}
          <div className="recommendation-cards-grid">
            {/* Primary Recommendation Card */}
            {recommendation.primaryRecommendation && (
              <div className="rec-card-hero">
                <div className="card-top-status">
                  <span className="status-badge-primary">
                    <ShieldCheck className="icon-xs" />
                    <span>Primary Match</span>
                  </span>
                  {recommendation.primaryRecommendation.matchScore && (
                    <span className="match-pill">
                      {recommendation.primaryRecommendation.matchScore}% Match
                    </span>
                  )}
                </div>

                <div className="card-header-block">
                  <h4 className="card-title-lg">
                    {recommendation.primaryRecommendation.modelName}
                  </h4>
                  <div className="specs-row-clean">
                    <span className="spec-item">
                      {recommendation.primaryRecommendation.provider || 'AI Model'}
                    </span>
                    {recommendation.primaryRecommendation.contextWindow && (
                      <>
                        <span className="spec-dot">·</span>
                        <span className="spec-item">
                          {recommendation.primaryRecommendation.contextWindow} context
                        </span>
                      </>
                    )}
                    {recommendation.primaryRecommendation.elo && (
                      <>
                        <span className="spec-dot">·</span>
                        <span className="spec-item font-mono font-semibold">
                          Elo {recommendation.primaryRecommendation.elo}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="card-content-body">
                  <p className="reasoning-text-clean">
                    {recommendation.primaryRecommendation.reasoning}
                  </p>

                  {recommendation.primaryRecommendation.strengthsHighlight?.length > 0 && (
                    <div className="strengths-clean-group">
                      <span className="strengths-label-clean">Key capabilities:</span>
                      <div className="strengths-pills-clean">
                        {recommendation.primaryRecommendation.strengthsHighlight.map((s, idx) => (
                          <span key={idx} className="strength-badge-clean">
                            <Check className="icon-xxs" />
                            <span>{s}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recommendation.primaryRecommendation.tradeoff && (
                    <div className="tradeoff-box-clean">
                      <Info className="icon-xs text-muted-dim flex-shrink-0" />
                      <span>{recommendation.primaryRecommendation.tradeoff}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="card-actions-clean">
                  <button
                    type="button"
                    className="btn-secondary-clean"
                    onClick={() => handleHighlight(recommendation.primaryRecommendation)}
                  >
                    <Target className="icon-xs" />
                    <span>View in Table</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-clean"
                    onClick={handleTestInArena}
                  >
                    <Swords className="icon-xs" />
                    <span>Test in Arena</span>
                  </button>
                  <button
                    type="button"
                    className="btn-outline-clean"
                    onClick={() => handleOpenPlayground(recommendation.primaryRecommendation.modelId)}
                  >
                    <FlaskConical className="icon-xs" />
                    <span>Playground</span>
                  </button>
                </div>
              </div>
            )}

            {/* Speed Option Card */}
            {recommendation.speedRecommendation && (
              <div className="rec-card-sub">
                <div className="card-top-status">
                  <span className="status-badge-sub">
                    <Gauge className="icon-xs" />
                    <span>Low Latency Pick</span>
                  </span>
                </div>

                <h4 className="card-title-md">
                  {recommendation.speedRecommendation.modelName}
                </h4>

                <div className="specs-row-clean">
                  <span className="spec-item">High Throughput</span>
                  {recommendation.speedRecommendation.elo && (
                    <>
                      <span className="spec-dot">·</span>
                      <span className="spec-item font-mono font-semibold">
                        Elo {recommendation.speedRecommendation.elo}
                      </span>
                    </>
                  )}
                </div>

                <p className="sub-reasoning-clean">
                  {recommendation.speedRecommendation.reasoning}
                </p>

                <div className="sub-actions-clean">
                  <button
                    type="button"
                    className="btn-ghost-clean"
                    onClick={() => handleHighlight(recommendation.speedRecommendation)}
                  >
                    <Target className="icon-xs" />
                    <span>View in Table</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-clean"
                    onClick={() => handleOpenPlayground(recommendation.speedRecommendation.modelId)}
                  >
                    <FlaskConical className="icon-xs" />
                    <span>Playground</span>
                  </button>
                </div>
              </div>
            )}

            {/* Value Option Card */}
            {recommendation.valueRecommendation && (
              <div className="rec-card-sub">
                <div className="card-top-status">
                  <span className="status-badge-sub">
                    <Coins className="icon-xs" />
                    <span>Cost-Efficient Pick</span>
                  </span>
                </div>

                <h4 className="card-title-md">
                  {recommendation.valueRecommendation.modelName}
                </h4>

                <div className="specs-row-clean">
                  <span className="spec-item">Cost Optimized</span>
                  {recommendation.valueRecommendation.elo && (
                    <>
                      <span className="spec-dot">·</span>
                      <span className="spec-item font-mono font-semibold">
                        Elo {recommendation.valueRecommendation.elo}
                      </span>
                    </>
                  )}
                </div>

                <p className="sub-reasoning-clean">
                  {recommendation.valueRecommendation.reasoning}
                </p>

                <div className="sub-actions-clean">
                  <button
                    type="button"
                    className="btn-ghost-clean"
                    onClick={() => handleHighlight(recommendation.valueRecommendation)}
                  >
                    <Target className="icon-xs" />
                    <span>View in Table</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost-clean"
                    onClick={() => handleOpenPlayground(recommendation.valueRecommendation.modelId)}
                  >
                    <FlaskConical className="icon-xs" />
                    <span>Playground</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Architectural Pro-Tip Callout */}
          {recommendation.keyEngineeringTip && (
            <div className="tip-callout-clean">
              <Lightbulb className="icon-xs text-amber-dim flex-shrink-0" />
              <p className="tip-callout-text">
                <strong className="text-zinc-200">Implementation tip:</strong>{' '}
                {recommendation.keyEngineeringTip}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
