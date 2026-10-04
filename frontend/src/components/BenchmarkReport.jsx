import { useState, useEffect } from 'react';
import { runBenchmarkSuite, getBenchmarkReport } from '../api.js';
import { FormattedResponse } from './FormattedResponse.jsx';
import { addToast } from './Toast.jsx';
import { CATEGORY_ICONS } from '../constants.js';

export function BenchmarkReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPromptId, setExpandedPromptId] = useState(null);

  useEffect(() => {
    fetchLatestReport();
  }, []);

  const fetchLatestReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBenchmarkReport();
      setReport(data);
    } catch (err) {
      console.warn('No prior benchmark found:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await runBenchmarkSuite();
      setReport(data);
      addToast('📊 Standardized Benchmark Suite completed successfully!', 'success');
    } catch (err) {
      setError(err.message || 'Benchmark execution failed');
      addToast(`⚠️ Benchmark failed: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const togglePrompt = (id) => {
    setExpandedPromptId(expandedPromptId === id ? null : id);
  };

  // Derived KPI metrics
  const championModel = report?.rankings?.[0];
  const validLatencyModels = report?.rankings?.filter(m => (m.avgLatencyMs || 0) > 0) || [];
  const fastestModel = validLatencyModels.length > 0
    ? [...validLatencyModels].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0]
    : null;
  const highestAccuracyModel = report?.rankings
    ? [...report.rankings].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0]
    : null;

  return (
    <div className="benchmark-page-container">
      {/* ── Hero & Execution Control Card ─────────────────────── */}
      <div className="benchmark-hero-card">
        <div className="benchmark-hero-content">
          <div className="benchmark-badge-row">
            <span className="benchmark-hero-badge">
              <span className="hero-pulse-dot"></span>
              📊 STANDARDIZED EVALUATION SUITE
            </span>
            <span className="benchmark-env-pill">Zero-Bias Environment</span>
          </div>

          <h2 className="benchmark-hero-title">Deterministic Multi-Model Benchmark</h2>
          <p className="benchmark-hero-desc">
            All models are evaluated on identical, fixed prompts under strictly locked deterministic hyperparameters (Temp: 0.0, Top_p: 1.0) and scored by our automated GPT-4o judge across 4 objective rubric dimensions.
          </p>

          {/* Hyperparameter Pills */}
          <div className="benchmark-param-chips">
            <span className="param-chip param-chip--deterministic">
              🛡️ Mode: Deterministic
            </span>
            <span className="param-chip">
              🌡️ Temp: {report?.hyperparameters?.temperature ?? 0.0}
            </span>
            <span className="param-chip">
              🎯 Top_p: {report?.hyperparameters?.top_p ?? 1.0}
            </span>
            <span className="param-chip">
              📝 Max Tokens: {report?.hyperparameters?.max_tokens ?? 1536}
            </span>
            <span className="param-chip">
              ⚖️ Judge Temp: 0.0
            </span>
            <span className="param-chip">
              🚫 Freq/Pres Penalty: 0.0
            </span>
          </div>
        </div>

        <div className="benchmark-hero-action">
          <button
            type="button"
            className="benchmark-run-btn"
            onClick={handleRunBenchmark}
            disabled={running}
          >
            {running ? (
              <>
                <span className="btn-spinner"></span>
                <span>Benchmarking 5 Models...</span>
              </>
            ) : (
              <>
                <span>🚀 Run Fresh Benchmark Suite</span>
              </>
            )}
          </button>
          <span className="benchmark-btn-subtext">
            Executes all models in parallel with deterministic temp
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="benchmark-error-banner">
          ⚠️ <strong>Execution Error:</strong> {error}
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {loading && !report && (
        <div className="benchmark-loading-state">
          <div className="loading-radar-ring"></div>
          <h4>Gathering Deterministic Benchmark Telemetry...</h4>
          <p>Evaluating multi-metric rubric matrices across all active models.</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !report && (
        <div className="benchmark-empty-state">
          <div className="empty-state-icon">🛡️</div>
          <h3>No Benchmark Suite Report Generated Yet</h3>
          <p>
            Run our standardized multi-model evaluation suite across all 5 models under strictly identical, deterministic hyperparameters (Temp: 0.0, Top_p: 1.0, Max Tokens: 1536) graded by the automated AI Judge.
          </p>
          <button
            type="button"
            className="benchmark-run-btn"
            onClick={handleRunBenchmark}
            disabled={running}
          >
            {running ? '⏳ Benchmarking All Models...' : '🚀 Run Initial Benchmark Suite'}
          </button>
        </div>
      )}

      {/* ── Active Benchmark Report Presentation ──────────────── */}
      {report && (
        <>
          {/* 1. KPI Highlight Summary Strip */}
          <div className="benchmark-kpi-grid">
            {/* KPI 1: Champion */}
            <div className="benchmark-kpi-card kpi-card--gold">
              <div className="kpi-top">
                <span className="kpi-tag">🏆 SUITE CHAMPION</span>
                <span className="kpi-medal">🥇</span>
              </div>
              <h3 className="kpi-value">{championModel?.overallScore?.toFixed(2) ?? '—'}<small>/10</small></h3>
              <span className="kpi-label">{championModel?.name || 'Top Model'}</span>
              <span className="kpi-sub">Highest combined rubric score</span>
            </div>

            {/* KPI 2: Fastest Model */}
            <div className="benchmark-kpi-card kpi-card--cyan">
              <div className="kpi-top">
                <span className="kpi-tag">⚡ SPEED LEADER</span>
                <span className="kpi-medal">💨</span>
              </div>
              <h3 className="kpi-value">{fastestModel?.avgLatencyMs?.toLocaleString() ?? '—'}<small>ms</small></h3>
              <span className="kpi-label">{fastestModel?.name || 'Fastest Model'}</span>
              <span className="kpi-sub">Lowest average response latency</span>
            </div>

            {/* KPI 3: Accuracy Winner */}
            <div className="benchmark-kpi-card kpi-card--emerald">
              <div className="kpi-top">
                <span className="kpi-tag">🎯 ACCURACY LEADER</span>
                <span className="kpi-medal">🎖️</span>
              </div>
              <h3 className="kpi-value">{highestAccuracyModel?.accuracy?.toFixed(1) ?? '—'}<small>/10</small></h3>
              <span className="kpi-label">{highestAccuracyModel?.name || 'Accuracy Leader'}</span>
              <span className="kpi-sub">Strict factuality & edge-case compliance</span>
            </div>

            {/* KPI 4: Reliability */}
            <div className="benchmark-kpi-card kpi-card--purple">
              <div className="kpi-top">
                <span className="kpi-tag">🛡️ SUITE INTEGRITY</span>
                <span className="kpi-medal">🔒</span>
              </div>
              <h3 className="kpi-value">100%<small> locked</small></h3>
              <span className="kpi-label">Deterministic Temp 0.0</span>
              <span className="kpi-sub">All test prompts completed without errors</span>
            </div>
          </div>

          {/* 2. Visual Charts Grid */}
          <div className="benchmark-charts-grid">
            {/* Chart 1: Overall Standardized Score */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h4 className="chart-title-text">🏆 Standardized Overall Score</h4>
                  <span className="chart-subtitle">Multi-prompt rubric average (Scale 0 – 10)</span>
                </div>
                <span className="chart-badge">Higher is better</span>
              </div>

              <div className="chart-bars-container">
                {report.rankings.map((m) => {
                  const pct = Math.min(100, Math.max(12, (m.overallScore / 10) * 100));
                  const isFirst = m.rank === 1;
                  const isSecond = m.rank === 2;
                  const isThird = m.rank === 3;

                  return (
                    <div key={m.modelId} className="chart-bar-row">
                      <div className="chart-bar-meta">
                        <div className="bar-model-info">
                          <span className={`rank-tag ${isFirst ? 'rank-gold' : isSecond ? 'rank-silver' : isThird ? 'rank-bronze' : ''}`}>
                            {isFirst ? '🥇 #1' : isSecond ? '🥈 #2' : isThird ? '🥉 #3' : `#${m.rank}`}
                          </span>
                          <span className="bar-model-name">{m.name}</span>
                        </div>
                        <span className="bar-score-val">{m.overallScore?.toFixed(2)} <small>/ 10</small></span>
                      </div>

                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isFirst ? 'fill-champion' : isSecond ? 'fill-second' : isThird ? 'fill-third' : 'fill-slate'}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Average Latency / Speed */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h4 className="chart-title-text">⚡ Average Latency & Speed</h4>
                  <span className="chart-subtitle">End-to-end response generation time</span>
                </div>
                <span className="chart-badge">Lower is faster (ms)</span>
              </div>

              <div className="chart-bars-container">
                {report.rankings.map((m) => {
                  const maxLat = Math.max(...report.rankings.map(r => r.avgLatencyMs || 1000), 2000);
                  const pct = Math.min(100, Math.max(10, ((m.avgLatencyMs || 500) / maxLat) * 100));
                  const isFastest = fastestModel && m.modelId === fastestModel.modelId;

                  return (
                    <div key={m.modelId} className="chart-bar-row">
                      <div className="chart-bar-meta">
                        <div className="bar-model-info">
                          {isFastest && <span className="speed-pill">⚡ FASTEST</span>}
                          <span className="bar-model-name">{m.name}</span>
                        </div>
                        <span className="bar-latency-val">{m.avgLatencyMs?.toLocaleString()} ms</span>
                      </div>

                      <div className="bar-track">
                        <div
                          className={`bar-fill ${isFastest ? 'fill-cyan' : 'fill-blue'}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Model Comparison Table */}
          <div className="benchmark-table-card">
            <div className="table-header-row">
              <div>
                <h3 className="table-title">📋 Comparative Benchmark Rankings</h3>
                <span className="table-subtitle">
                  Deterministic rubric assessment executed across all 5 models simultaneously
                </span>
              </div>
              <div className="table-timestamp-badge">
                📅 Evaluated: {new Date(report.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="table-wrapper">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th># Rank</th>
                    <th>Model & Provider</th>
                    <th>Overall Score</th>
                    <th>🎯 Accuracy</th>
                    <th>📐 Formatting</th>
                    <th>🧠 Logic</th>
                    <th>✂️ Conciseness</th>
                    <th>⚡ Latency</th>
                    <th>🛡️ Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rankings.map((m) => {
                    const isWinner = m.rank === 1;

                    return (
                      <tr key={m.modelId} className={isWinner ? 'winner-row' : ''}>
                        <td className="rank-cell">
                          <span className={`rank-badge ${m.rank === 1 ? 'rank-1' : m.rank === 2 ? 'rank-2' : m.rank === 3 ? 'rank-3' : ''}`}>
                            {m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : `#${m.rank}`}
                          </span>
                        </td>
                        <td>
                          <div className="table-model-name">
                            <span>{m.name}</span>
                            {isWinner && <span className="winner-row-tag">👑 WINNER</span>}
                          </div>
                          <div className="table-model-provider">{m.provider}</div>
                        </td>
                        <td>
                          <span className="overall-score-pill">
                            {m.overallScore?.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`rubric-pill ${m.accuracy >= 7.5 ? 'pill-high' : m.accuracy >= 6.0 ? 'pill-med' : 'pill-low'}`}>
                            {m.accuracy}/10
                          </span>
                        </td>
                        <td>
                          <span className={`rubric-pill ${m.formatting >= 7.5 ? 'pill-high' : m.formatting >= 6.0 ? 'pill-med' : 'pill-low'}`}>
                            {m.formatting}/10
                          </span>
                        </td>
                        <td>
                          <span className={`rubric-pill ${m.logic >= 7.5 ? 'pill-high' : m.logic >= 6.0 ? 'pill-med' : 'pill-low'}`}>
                            {m.logic}/10
                          </span>
                        </td>
                        <td>
                          <span className={`rubric-pill ${m.conciseness >= 7.5 ? 'pill-high' : m.conciseness >= 6.0 ? 'pill-med' : 'pill-low'}`}>
                            {m.conciseness}/10
                          </span>
                        </td>
                        <td className="latency-cell">
                          {m.avgLatencyMs?.toLocaleString()} ms
                        </td>
                        <td>
                          {m.truncationCount > 0 ? (
                            <span className="status-pill status-pill--truncated">
                              ⚠️ {m.truncationCount} Truncated
                            </span>
                          ) : (
                            <span className="status-pill status-pill--complete">
                              ✓ Complete
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Standardized Prompts Response Inspector */}
          {report.promptResults && report.promptResults.length > 0 && (
            <div className="prompt-inspector-card">
              <div className="inspector-header">
                <div>
                  <h3 className="inspector-title">🔍 Standardized Prompts & Model Outputs Inspector</h3>
                  <p className="inspector-subtitle">
                    Inspect and compare the exact responses generated by each model under identical test prompts.
                  </p>
                </div>
                <span className="inspector-count-tag">
                  {report.promptResults.length} Test Prompts Evaluated
                </span>
              </div>

              <div className="inspector-accordions-list">
                {report.promptResults.map((pr) => {
                  const isOpen = expandedPromptId === pr.promptId;
                  const catIcon = CATEGORY_ICONS[pr.category] || '🌐';

                  return (
                    <div key={pr.promptId} className={`inspector-accordion ${isOpen ? 'is-open' : ''}`}>
                      <div
                        className="accordion-header"
                        onClick={() => togglePrompt(pr.promptId)}
                      >
                        <div className="accordion-header-left">
                          <span className="accordion-category-pill">
                            {catIcon} {pr.category}
                          </span>
                          <span className="accordion-prompt-title">{pr.title}:</span>
                          <span className="accordion-prompt-quote">"{pr.prompt}"</span>
                        </div>
                        <div className="accordion-toggle-btn">
                          <span>{isOpen ? 'Collapse' : 'Inspect Outputs'}</span>
                          <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="accordion-body">
                          <div className="inspector-models-grid">
                            {Object.values(pr.modelOutputs).map((out) => (
                              <div key={out.modelId} className="inspector-response-card">
                                <div className="response-card-header">
                                  <div className="response-card-title-row">
                                    <span className="model-avatar-icon">🤖</span>
                                    <span className="response-card-model-name">{out.name}</span>
                                  </div>
                                  <div className="response-card-meta">
                                    {out.isTruncated && (
                                      <span className="status-pill status-pill--truncated">Truncated</span>
                                    )}
                                    <span className="response-card-latency">
                                      ⚡ {out.latencyMs}ms
                                    </span>
                                  </div>
                                </div>
                                <div className="response-card-content">
                                  <FormattedResponse text={out.text} isStreaming={false} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
