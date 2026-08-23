import { useState, useEffect } from 'react';
import { createBattle, voteBattle, getLeaderboard } from './api.js';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' | 'leaderboard'
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
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
      setCurrentBattle(battle);
    } catch (err) {
      setError(err.message || 'Failed to start battle');
    } finally {
      setLoading(false);
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
          {/* Prompt Entry Form */}
          {!currentBattle && !loading && (
            <form onSubmit={handleStartBattle} className="prompt-card">
              <label htmlFor="prompt-input">Enter a prompt to evaluate 2 anonymous AI models:</label>
              <textarea
                id="prompt-input"
                className="prompt-textarea"
                placeholder="e.g. Write a quick python script to parse CSV data, or explain quantum physics..."
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

          {/* Loading Indicator */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching parallel responses from 2 anonymous AI models...</p>
            </div>
          )}

          {/* Battle Arena Cards */}
          {currentBattle && (
            <>
              <div className="prompt-card" style={{ padding: '16px 20px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>PROMPT:</span>
                <p style={{ marginTop: '4px', fontSize: '1.05rem' }}>{currentBattle.prompt}</p>
              </div>

              {/* Side-by-side response panels */}
              <div className="battle-grid">
                {/* Panel A */}
                <div className="response-panel">
                  <div className="panel-header">
                    <span className="panel-title">
                      🤖 {voteResult ? voteResult.modelA.name : 'Model A'}
                    </span>
                    {voteResult && (
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
                    {currentBattle.responseA}
                  </div>
                </div>

                {/* Panel B */}
                <div className="response-panel">
                  <div className="panel-header">
                    <span className="panel-title">
                      🤖 {voteResult ? voteResult.modelB.name : 'Model B'}
                    </span>
                    {voteResult && (
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
                    {currentBattle.responseB}
                  </div>
                </div>
              </div>

              {/* Voting Bar (Pre-Vote) */}
              {!voteResult && (
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
            </>
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
