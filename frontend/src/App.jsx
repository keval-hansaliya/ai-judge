import { useState, useEffect } from 'react';
import { createBattle, appendTurn, voteBattle, getLeaderboard } from './api.js';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' | 'leaderboard'
  const [prompt, setPrompt] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);

  // Active battle state
  const [currentBattle, setCurrentBattle] = useState(null);
  const [voteResult, setVoteResult] = useState(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);

  // Load Leaderboard when switching to leaderboard tab
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoadingLb(true);
    setError(null);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLb(false);
    }
  };

  const handleStartBattle = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setVoteResult(null);
    setCurrentBattle(null);

    try {
      const battle = await createBattle(prompt.trim());
      // Ensure turns structure
      if (!battle.turns || !battle.turns.length) {
        battle.turns = [{ turn: 1, prompt: battle.prompt, responseA: battle.responseA, responseB: battle.responseB }];
      }
      setCurrentBattle(battle);
    } catch (err) {
      setError(err.message || 'Failed to start battle');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpPrompt.trim() || !currentBattle || sendingFollowUp) return;

    setSendingFollowUp(true);
    setError(null);

    try {
      const res = await appendTurn(currentBattle.battleId, followUpPrompt.trim());
      setCurrentBattle(prev => ({
        ...prev,
        turns: res.turns
      }));
      setFollowUpPrompt('');
    } catch (err) {
      setError(err.message || 'Failed to send follow-up prompt');
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleVote = async (winner) => {
    if (!currentBattle || voting || voteResult) return;

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

  const handleNextBattle = () => {
    setCurrentBattle(null);
    setVoteResult(null);
    setPrompt('');
    setFollowUpPrompt('');
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="app-header">
        <div className="logo-title">
          <span style={{ fontSize: '1.8rem' }}>⚔️</span>
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
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </nav>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="error-banner">
          ⚠️ <strong>Error:</strong> {error}
        </div>
      )}

      {/* TAB 1: ARENA BATTLE */}
      {activeTab === 'arena' && (
        <>
          {/* Initial Prompt Form */}
          {!currentBattle && !loading && (
            <form onSubmit={handleStartBattle} className="prompt-card">
              <label htmlFor="prompt-input">Enter a prompt to evaluate 2 anonymous AI models:</label>
              <textarea
                id="prompt-input"
                className="prompt-textarea"
                placeholder="e.g. Give 3 quick tips to stay fit and healthy..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <button
                type="submit"
                className="submit-btn"
                disabled={!prompt.trim()}
              >
                ⚔️ Generate Battle Response
              </button>
            </form>
          )}

          {/* Loading Initial Battle */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching parallel responses from 2 anonymous AI models...</p>
            </div>
          )}

          {/* Active Battle Conversation Thread */}
          {currentBattle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {currentBattle.turns.map((turnItem, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Turn Prompt Header */}
                  <div className="prompt-card" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="turn-badge">Turn #{turnItem.turn}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>PROMPT</span>
                    </div>
                    <p style={{ marginTop: '6px', fontSize: '1.05rem' }}>{turnItem.prompt}</p>
                  </div>

                  {/* Side-by-side Response Panels for this turn */}
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
                        {turnItem.responseA}
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
                        {turnItem.responseB}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Follow-up State */}
              {sendingFollowUp && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Generating follow-up responses from both models...</p>
                </div>
              )}

              {/* Multi-turn Follow-up Input Box (Pre-Vote) */}
              {!voteResult && !sendingFollowUp && (
                <form onSubmit={handleSendFollowUp} className="followup-box">
                  <label htmlFor="followup-input">Ask a follow-up question to continue the conversation:</label>
                  <div className="followup-row">
                    <input
                      id="followup-input"
                      type="text"
                      className="followup-input"
                      placeholder="e.g. Can you clarify point 2, or explain in simpler terms?"
                      value={followUpPrompt}
                      onChange={(e) => setFollowUpPrompt(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="followup-btn"
                      disabled={!followUpPrompt.trim()}
                    >
                      💬 Send Follow-up
                    </button>
                  </div>
                </form>
              )}

              {/* Voting Bar (Pre-Vote) */}
              {!voteResult && !sendingFollowUp && (
                <div className="voting-bar">
                  <button
                    className="vote-btn"
                    onClick={() => handleVote('A')}
                    disabled={voting}
                  >
                    👈 Model A is Better
                  </button>
                  <button
                    className="vote-btn tie-btn"
                    onClick={() => handleVote('TIE')}
                    disabled={voting}
                  >
                    🤝 Tie / Equal
                  </button>
                  <button
                    className="vote-btn"
                    onClick={() => handleVote('B')}
                    disabled={voting}
                  >
                    Model B is Better 👉
                  </button>
                </div>
              )}

              {/* Post-Vote Result Banner */}
              {voteResult && (
                <div className="result-banner">
                  <div className="result-info">
                    <h3>Vote Recorded! Model Identities Revealed</h3>
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

      {/* TAB 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>🏆 Elo Leaderboard</h2>
            <button className="tab-btn" onClick={fetchLeaderboard} disabled={loadingLb}>
              🔄 Refresh
            </button>
          </div>

          {loadingLb ? (
            <div className="loading-state" style={{ border: 'none' }}>
              <div className="spinner"></div>
              <p>Loading model standings...</p>
            </div>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Model Name</th>
                  <th>Elo Rating</th>
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
