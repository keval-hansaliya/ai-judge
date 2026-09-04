import { useState, useEffect } from 'react';
import { createBattleStream, appendTurnStream, voteBattle, triggerAIJudge, getLeaderboard } from './api.js';
import { BenchmarkReport } from './components/BenchmarkReport.jsx';
import { FormattedResponse } from './components/FormattedResponse.jsx';
import './App.css';

const CATEGORIES = ['General', 'Coding', 'Math', 'Reasoning', 'Creative'];
const LB_CATEGORIES = ['All', 'General', 'Coding', 'Math', 'Reasoning', 'Creative'];

const AVAILABLE_MODELS = [
  { id: "models/gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "Google" },
  { id: "models/gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "Google" },
  { id: "openai/gpt-oss-120b", name: "OpenAI GPT-OSS 120B", provider: "Groq" },
  { id: "openai/gpt-oss-20b", name: "OpenAI GPT-OSS 20B", provider: "Groq" },
  { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B", provider: "Groq" }
];




function App() {
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' | 'playground' | 'leaderboard'
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedLbCategory, setSelectedLbCategory] = useState('All');

  // Arena State
  const [prompt, setPrompt] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [voting, setVoting] = useState(false);
  const [evaluatingJudge, setEvaluatingJudge] = useState(false);
  const [error, setError] = useState(null);

  const [currentBattle, setCurrentBattle] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [judgeResult, setJudgeResult] = useState(null);

  // Playground State (Named Side-by-Side Model Testing)
  const [pgModelA, setPgModelA] = useState(AVAILABLE_MODELS[0].id);
  const [pgModelB, setPgModelB] = useState(AVAILABLE_MODELS[1].id);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [pgPrompt, setPgPrompt] = useState('');
  const [pgResA, setPgResA] = useState('');
  const [pgResB, setPgResB] = useState('');
  const [pgStreaming, setPgStreaming] = useState(false);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard(selectedLbCategory);
    }
  }, [activeTab, selectedLbCategory]);

  const fetchLeaderboard = async (category = selectedLbCategory) => {
    setLoadingLb(true);
    setError(null);
    try {
      const data = await getLeaderboard(category);
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLb(false);
    }
  };

  // Handler: Start Blind Arena Battle
  const handleStartBattle = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setVoteResult(null);
    setJudgeResult(null);

    const initialTurns = [
      { turn: 1, prompt: prompt.trim(), responseA: '', responseB: '' }
    ];

    setCurrentBattle({ battleId: null, prompt: prompt.trim(), category: selectedCategory, turns: initialTurns });

    try {
      await createBattleStream(
        prompt.trim(),
        selectedCategory,
        // onChunkA
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            turns[0] = { ...turns[0], responseA: turns[0].responseA + chunk };
            return { ...prev, turns };
          });
        },
        // onChunkB
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            turns[0] = { ...turns[0], responseB: turns[0].responseB + chunk };
            return { ...prev, turns };
          });
        },
        // onDone
        (data) => {
          setCurrentBattle((prev) => ({
            ...prev,
            battleId: data.battleId,
            turns: data.turns
          }));
          setIsStreaming(false);
        },
        // onError
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Streaming battle failed');
      setIsStreaming(false);
    }
  };

  // Handler: Send Follow-up Turn in Arena
  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpPrompt.trim() || !currentBattle || isStreaming) return;

    const newPrompt = followUpPrompt.trim();
    setFollowUpPrompt('');
    setIsStreaming(true);
    setError(null);

    const currentTurnNum = currentBattle.turns.length + 1;
    const updatedTurns = [
      ...currentBattle.turns,
      { turn: currentTurnNum, prompt: newPrompt, responseA: '', responseB: '' }
    ];

    setCurrentBattle((prev) => ({
      ...prev,
      turns: updatedTurns
    }));

    try {
      await appendTurnStream(
        currentBattle.battleId,
        newPrompt,
        // onChunkA
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            const lastIdx = turns.length - 1;
            turns[lastIdx] = { ...turns[lastIdx], responseA: turns[lastIdx].responseA + chunk };
            return { ...prev, turns };
          });
        },
        // onChunkB
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            const lastIdx = turns.length - 1;
            turns[lastIdx] = { ...turns[lastIdx], responseB: turns[lastIdx].responseB + chunk };
            return { ...prev, turns };
          });
        },
        // onDone
        (data) => {
          setCurrentBattle((prev) => ({
            ...prev,
            turns: data.turns
          }));
          setIsStreaming(false);
        },
        // onError
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Streaming follow-up failed');
      setIsStreaming(false);
    }
  };

  // Handler: Human Vote
  const handleVote = async (winner) => {
    if (!currentBattle || !currentBattle.battleId || voting || voteResult || isStreaming) return;

    setVoting(true);
    setError(null);

    try {
      const result = await voteBattle(currentBattle.battleId, winner);
      setVoteResult(result);
    } catch (err) {
      setError(err.message || 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  // Handler: Automated AI Judge
  const handleRunAIJudge = async () => {
    if (!currentBattle || !currentBattle.battleId || evaluatingJudge || isStreaming) return;

    setEvaluatingJudge(true);
    setError(null);

    try {
      const res = await triggerAIJudge(currentBattle.battleId);
      setJudgeResult(res);
    } catch (err) {
      setError(err.message || 'AI Judge evaluation failed');
    } finally {
      setEvaluatingJudge(false);
    }
  };

  const handleNextBattle = () => {
    setCurrentBattle(null);
    setVoteResult(null);
    setJudgeResult(null);
    setPrompt('');
    setFollowUpPrompt('');
  };

  // Handler: Start Named Playground Side-by-Side Test
  const handleStartPlayground = async (e) => {
    e.preventDefault();
    if (!pgPrompt.trim() || pgStreaming) return;

    setPgStreaming(true);
    setPgResA('');
    setPgResB('');
    setError(null);

    try {
      // Re-uses createBattleStream streaming logic
      await createBattleStream(
        pgPrompt.trim(),
        'General',
        (chunk) => setPgResA((prev) => prev + chunk),
        (chunk) => setPgResB((prev) => prev + chunk),
        () => setPgStreaming(false),
        (err) => {
          setError(err.message);
          setPgStreaming(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Playground streaming failed');
      setPgStreaming(false);
    }
  };

  const nameModelA = AVAILABLE_MODELS.find(m => m.id === pgModelA)?.name || "Model A";
  const nameModelB = AVAILABLE_MODELS.find(m => m.id === pgModelB)?.name || "Model B";

  return (
    <div className="app-container">
      {/* Header Navigation */}
      <header className="app-header">
        <div className="logo-title">
          <span style={{ fontSize: '2rem' }}>⚔️</span>
          <h1>LM Arena — AI Judge</h1>
        </div>
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => setActiveTab('arena')}
          >
            Arena Battle
          </button>
          <button
            className={`tab-btn ${activeTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setActiveTab('benchmark')}
          >
            📊 Benchmark Report
          </button>
          <button
            className={`tab-btn ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => setActiveTab('playground')}
          >
            Named Playground
          </button>
          <button
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </nav>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '12px 18px', borderRadius: '12px', color: '#fca5a5', marginBottom: '16px', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            ⚠️ <strong>Error:</strong> {error}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setError(null); setCurrentBattle(null); }}
              style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              🔄 New Battle
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ARENA BLIND BATTLE */}
      {activeTab === 'arena' && (
        <>
          {!currentBattle && (
            <form onSubmit={handleStartBattle} className="prompt-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <label htmlFor="prompt-input">Enter a prompt to evaluate 2 anonymous AI models side-by-side:</label>
                
                <div className="category-row">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Domain:</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                      disabled={isStreaming}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="prompt-input"
                className="prompt-textarea"
                placeholder={
                  selectedCategory === 'Coding' ? 'e.g. Write a Python function for binary search...' :
                  selectedCategory === 'Math' ? 'e.g. Solve integral of x^2 * e^x dx step by step...' :
                  selectedCategory === 'Reasoning' ? 'e.g. A bat and ball cost $1.10. The bat costs $1 more than the ball...' :
                  selectedCategory === 'Creative' ? 'e.g. Write a short sci-fi story about quantum AI...' :
                  'e.g. Give 3 quick tips to stay fit and healthy...'
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={isStreaming}
              />

              <button
                type="submit"
                className="submit-btn"
                disabled={!prompt.trim() || isStreaming}
              >
                {isStreaming ? '⚡ Streaming Token Responses...' : `⚡ Stream Battle [${selectedCategory}]`}
              </button>
            </form>
          )}

          {currentBattle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {currentBattle.turns.map((turnItem, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="prompt-card" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="turn-badge" style={{ background: 'var(--accent-primary)', padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>Turn #{turnItem.turn}</span>
                        <span className="category-pill active" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>
                          {currentBattle.category || 'General'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>USER PROMPT</span>
                    </div>
                    <p style={{ marginTop: '6px', fontSize: '1.05rem' }}>{turnItem.prompt}</p>
                  </div>

                  <div className="battle-grid">
                    {/* Model A Panel */}
                    <div className="response-panel">
                      <div className="panel-header">
                        <span className="panel-title">
                          🤖 {voteResult ? voteResult.modelA.name : 'Model A'}
                        </span>
                        {voteResult && idx === currentBattle.turns.length - 1 && (
                          <span className="elo-badge">
                            Elo: {voteResult.modelA.newElo}{' '}
                            <span className={voteResult.modelA.newElo >= voteResult.modelA.oldElo ? 'elo-plus' : 'elo-minus'}>
                              ({voteResult.modelA.newElo >= voteResult.modelA.oldElo ? '+' : ''}
                              {voteResult.modelA.newElo - voteResult.modelA.oldElo})
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="response-content">
                        <FormattedResponse text={turnItem.responseA} isStreaming={isStreaming && idx === currentBattle.turns.length - 1} />
                      </div>
                    </div>

                    {/* Model B Panel */}
                    <div className="response-panel">
                      <div className="panel-header">
                        <span className="panel-title">
                          🤖 {voteResult ? voteResult.modelB.name : 'Model B'}
                        </span>
                        {voteResult && idx === currentBattle.turns.length - 1 && (
                          <span className="elo-badge">
                            Elo: {voteResult.modelB.newElo}{' '}
                            <span className={voteResult.modelB.newElo >= voteResult.modelB.oldElo ? 'elo-plus' : 'elo-minus'}>
                              ({voteResult.modelB.newElo >= voteResult.modelB.oldElo ? '+' : ''}
                              {voteResult.modelB.newElo - voteResult.modelB.oldElo})
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="response-content">
                        <FormattedResponse text={turnItem.responseB} isStreaming={isStreaming && idx === currentBattle.turns.length - 1} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!voteResult && (
                <form onSubmit={handleSendFollowUp} className="prompt-card" style={{ padding: '16px 20px' }}>
                  <label htmlFor="followup-input" style={{ fontSize: '0.9rem' }}>Ask a follow-up question to continue the conversation:</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <input
                      id="followup-input"
                      type="text"
                      className="prompt-textarea"
                      style={{ minHeight: '44px', flex: 1, padding: '10px 14px' }}
                      placeholder="e.g. Can you clarify point 2, or optimize your code?"
                      value={followUpPrompt}
                      onChange={(e) => setFollowUpPrompt(e.target.value)}
                      disabled={isStreaming}
                    />
                    <button
                      type="submit"
                      className="submit-btn"
                      style={{ padding: '10px 20px' }}
                      disabled={!followUpPrompt.trim() || isStreaming}
                    >
                      {isStreaming ? '⚡ Streaming...' : '⚡ Send Follow-up'}
                    </button>
                  </div>
                </form>
              )}

              {!voteResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="voting-bar">
                    <button
                      className="vote-btn"
                      onClick={() => handleVote('A')}
                      disabled={voting || isStreaming || !currentBattle.battleId}
                    >
                      👈 Model A is Better
                    </button>
                    <button
                      className="vote-btn tie-btn"
                      onClick={() => handleVote('TIE')}
                      disabled={voting || isStreaming || !currentBattle.battleId}
                    >
                      🤝 Tie / Equal
                    </button>
                    <button
                      className="vote-btn"
                      onClick={() => handleVote('B')}
                      disabled={voting || isStreaming || !currentBattle.battleId}
                    >
                      Model B is Better 👉
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="tab-btn active"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: '12px 28px', fontSize: '1rem' }}
                      onClick={handleRunAIJudge}
                      disabled={evaluatingJudge || isStreaming || !currentBattle.battleId}
                    >
                      {evaluatingJudge ? '🤖 AI Judge Evaluating Rubric...' : '🤖 Trigger Automated AI Judge Benchmark'}
                    </button>
                  </div>
                </div>
              )}

              {judgeResult && (
                <div className="judge-card">
                  <div className="judge-header">
                    <h3>🤖 Automated AI Judge Benchmark Result</h3>
                    <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                      Verdict: {judgeResult.verdict === 'TIE' ? '🤝 TIE' : `Winner: Model ${judgeResult.verdict}`}
                    </span>
                  </div>

                  <div className="judge-grid">
                    <div className="metric-box">
                      <span className="metric-title">Model A Metrics (Score: {judgeResult.modelA.overallScore}/10)</span>
                      <div className="metric-row"><span>Accuracy:</span> <span>{judgeResult.modelA.accuracy}/10</span></div>
                      <div className="metric-row"><span>Formatting:</span> <span>{judgeResult.modelA.formatting}/10</span></div>
                      <div className="metric-row"><span>Logic:</span> <span>{judgeResult.modelA.logic}/10</span></div>
                      <div className="metric-row"><span>Conciseness:</span> <span>{judgeResult.modelA.conciseness}/10</span></div>
                    </div>

                    <div className="metric-box">
                      <span className="metric-title">Model B Metrics (Score: {judgeResult.modelB.overallScore}/10)</span>
                      <div className="metric-row"><span>Accuracy:</span> <span>{judgeResult.modelB.accuracy}/10</span></div>
                      <div className="metric-row"><span>Formatting:</span> <span>{judgeResult.modelB.formatting}/10</span></div>
                      <div className="metric-row"><span>Logic:</span> <span>{judgeResult.modelB.logic}/10</span></div>
                      <div className="metric-row"><span>Conciseness:</span> <span>{judgeResult.modelB.conciseness}/10</span></div>
                    </div>
                  </div>

                  <div className="judge-reasoning">
                    <strong>⚖️ Judge Reasoning:</strong>
                    <p style={{ marginTop: '4px' }}>{judgeResult.reasoning}</p>
                  </div>
                </div>
              )}

              {voteResult && (
                <div className="result-banner">
                  <div className="result-info">
                    <h3>🎉 Vote Recorded! Model Identities Revealed</h3>
                    <p>
                      {voteResult.winner === 'TIE'
                        ? 'Result declared as TIE'
                        : voteResult.winner === 'A'
                        ? `Winner: ${voteResult.modelA.name} (Model A)`
                        : `Winner: ${voteResult.modelB.name} (Model B)`}
                    </p>
                  </div>
                  <button className="next-btn" onClick={handleNextBattle}>
                    🚀 Next Battle
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: BENCHMARK REPORT */}
      {activeTab === 'benchmark' && (
        <BenchmarkReport />
      )}

      {/* TAB 3: NAMED PLAYGROUND (DIRECT MODEL TESTING) */}
      {activeTab === 'playground' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="playground-controls">
            <div className="model-select-group">
              <label htmlFor="select-model-a">Select Model A:</label>
              <select
                id="select-model-a"
                className="model-dropdown"
                value={pgModelA}
                onChange={(e) => setPgModelA(e.target.value)}
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="model-select-group">
              <label htmlFor="select-model-b">Select Model B:</label>
              <select
                id="select-model-b"
                className="model-dropdown"
                value={pgModelB}
                onChange={(e) => setPgModelB(e.target.value)}
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="slider-group">
              <label><span>Temperature:</span> <span>{temperature}</span></label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <label><span>Max Tokens:</span> <span>{maxTokens}</span></label>
              <input
                type="range"
                min="128"
                max="1024"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
          </div>

          <form onSubmit={handleStartPlayground} className="prompt-card">
            <label htmlFor="pg-prompt-input">Enter prompt for side-by-side comparison:</label>
            <textarea
              id="pg-prompt-input"
              className="prompt-textarea"
              placeholder="e.g. Compare recursion vs iteration in terms of time and space complexity..."
              value={pgPrompt}
              onChange={(e) => setPgPrompt(e.target.value)}
              rows={3}
              disabled={pgStreaming}
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={!pgPrompt.trim() || pgStreaming}
            >
              {pgStreaming ? '⚡ Streaming Both Models...' : '⚡ Stream Side-by-Side Comparison'}
            </button>
          </form>

          {(pgResA || pgResB || pgStreaming) && (
            <div className="battle-grid">
              <div className="response-panel">
                <div className="panel-header">
                  <span className="panel-title">🤖 {nameModelA}</span>
                </div>
                <div className="response-content">
                  <FormattedResponse text={pgResA} isStreaming={pgStreaming} />
                </div>
              </div>

              <div className="response-panel">
                <div className="panel-header">
                  <span className="panel-title">🤖 {nameModelB}</span>
                </div>
                <div className="response-content">
                  <FormattedResponse text={pgResB} isStreaming={pgStreaming} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2>🏆 Elo Leaderboard</h2>
            <button className="tab-btn" onClick={() => fetchLeaderboard(selectedLbCategory)} disabled={loadingLb}>
              🔄 Refresh
            </button>
          </div>

          <div className="category-row" style={{ marginTop: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Domain:</span>
            {LB_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${selectedLbCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedLbCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {loadingLb ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Loading {selectedLbCategory} category standings...</p>
            </div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Model Name</th>
                  <th>{selectedLbCategory === 'All' ? 'Global Elo' : `${selectedLbCategory} Elo`}</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Ties</th>
                  <th>Total Battles</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((model, idx) => (
                  <tr key={idx}>
                    <td className="rank-cell">#{idx + 1}</td>
                    <td><strong>{model.name}</strong></td>
                    <td className="elo-cell">{model.elo}</td>
                    <td>{model.wins}</td>
                    <td>{model.losses}</td>
                    <td>{model.ties}</td>
                    <td>{model.totalBattles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
