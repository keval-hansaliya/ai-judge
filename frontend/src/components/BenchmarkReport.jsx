import { useState, useEffect } from 'react';
import { runBenchmarkSuite, getBenchmarkReport } from '../api.js';

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
      console.warn("No prior benchmark found:", err.message);
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
    } catch (err) {
      setError(err.message || "Benchmark execution failed");
    } finally {
      setRunning(false);
    }
  };

  const togglePrompt = (id) => {
    setExpandedPromptId(expandedPromptId === id ? null : id);
  };

  return (
    <div className="benchmark-container">
      {/* Header & Controls */}
      <div className="benchmark-header-card">
        <div>
          <h2>📊 Standardized Model Benchmark Suite</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.95rem' }}>
            Multi-model evaluation executed under strictly identical, deterministic hyperparameters.
          </p>
          {report?.hyperparameters && (
            <div className="benchmark-params-badge">
              <span className="param-tag deterministic">🛡️ Deterministic Mode</span>
              <span className="param-tag">Temp: {report.hyperparameters.temperature}</span>
              <span className="param-tag">Top_p: {report.hyperparameters.top_p}</span>
              <span className="param-tag">Max Tokens: {report.hyperparameters.max_tokens}</span>
              <span className="param-tag">Freq/Pres Penalty: 0.0</span>
              <span className="param-tag">Judge Temp: 0.0</span>
            </div>
          )}
        </div>

        <button
          className="submit-btn"
          style={{ alignSelf: 'center', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
          onClick={handleRunBenchmark}
          disabled={running}
        >
          {running ? '⏳ Benchmarking All Models...' : '🚀 Run Fresh Benchmark'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '12px 18px', borderRadius: '12px', color: '#fca5a5' }}>
          ⚠️ <strong>Error:</strong> {error}
        </div>
      )}

      {loading && !report && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>Loading benchmark data...</p>
        </div>
      )}

      {report && (
        <>
          {/* Visual Charts Grid */}
          <div className="benchmark-charts-grid">
            {/* Chart 1: Overall Standardized Score */}
            <div className="chart-card">
              <div className="chart-title">
                <span>🏆 Overall Score (Out of 10)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Higher is better</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.rankings.map((m) => {
                  const pct = Math.min(100, Math.max(10, (m.overallScore / 10) * 100));
                  return (
                    <div key={m.modelId} className="bar-row">
                      <div className="bar-meta">
                        <span>#{m.rank} {m.name}</span>
                        <span style={{ color: '#a78bfa' }}>{m.overallScore} / 10</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill purple" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Average Latency / Speed */}
            <div className="chart-card">
              <div className="chart-title">
                <span>⚡ Average Latency</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Lower is faster (ms)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {report.rankings.map((m) => {
                  const maxLat = Math.max(...report.rankings.map(r => r.avgLatencyMs || 1000), 2000);
                  const pct = Math.min(100, Math.max(8, (m.avgLatencyMs / maxLat) * 100));
                  return (
                    <div key={m.modelId} className="bar-row">
                      <div className="bar-meta">
                        <span>{m.name}</span>
                        <span style={{ color: '#38bdf8' }}>{m.avgLatencyMs} ms</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill cyan" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="leaderboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📋 Comparative Benchmark Rankings</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Evaluated: {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>

            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Model Name</th>
                  <th>Overall Score</th>
                  <th>Accuracy</th>
                  <th>Formatting</th>
                  <th>Logic</th>
                  <th>Conciseness</th>
                  <th>Avg Latency</th>
                  <th>Truncation Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rankings.map((m) => (
                  <tr key={m.modelId}>
                    <td className="rank-cell">#{m.rank}</td>
                    <td>
                      <strong>{m.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.provider}</div>
                    </td>
                    <td className="elo-cell" style={{ color: '#34d399' }}>{m.overallScore}</td>
                    <td>{m.accuracy}/10</td>
                    <td>{m.formatting}/10</td>
                    <td>{m.logic}/10</td>
                    <td>{m.conciseness}/10</td>
                    <td>{m.avgLatencyMs} ms</td>
                    <td>
                      {m.truncationCount > 0 ? (
                        <span className="truncation-pill">⚠️ {m.truncationCount} Truncated</span>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>✓ Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Standardized Prompts Response Inspector */}
          {report.promptResults && report.promptResults.length > 0 && (
            <div className="prompt-inspector-card">
              <h3>🔍 Standardized Prompts & Model Outputs</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Inspect raw outputs generated by each model under identical test prompts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                {report.promptResults.map((pr) => {
                  const isOpen = expandedPromptId === pr.promptId;
                  return (
                    <div key={pr.promptId} className="prompt-accordion">
                      <div className="prompt-accordion-header" onClick={() => togglePrompt(pr.promptId)}>
                        <div>
                          <span style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', marginRight: '10px', fontWeight: 700 }}>
                            {pr.category}
                          </span>
                          <strong>{pr.title}:</strong> <span style={{ color: '#cbd5e1' }}>"{pr.prompt}"</span>
                        </div>
                        <span>{isOpen ? '▲ Collapse' : '▼ Expand Outputs'}</span>
                      </div>

                      {isOpen && (
                        <div className="prompt-accordion-body">
                          {Object.values(pr.modelOutputs).map((out) => (
                            <div key={out.modelId} className="response-panel" style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
                              <div className="panel-header" style={{ paddingBottom: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🤖 {out.name}</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {out.isTruncated && <span className="truncation-pill">Truncated</span>}
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{out.latencyMs}ms</span>
                                </div>
                              </div>
                              <div className="response-content" style={{ fontSize: '0.9rem', maxHeight: '250px', overflowY: 'auto' }}>
                                {out.text}
                              </div>
                            </div>
                          ))}
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
