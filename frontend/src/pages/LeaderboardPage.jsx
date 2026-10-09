import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api.js';
import { LB_CATEGORIES, CATEGORY_ICONS } from '../constants.js';
import { addToast } from '../components/Toast.jsx';
import { ModelMatchmaker } from '../components/ModelMatchmaker.jsx';
import './LeaderboardPage.css';

/**
 * LeaderboardPage — Community Elo Leaderboard & Model Tiers.
 *
 * Displays global and domain-specific Elo ratings, podium showcase for the
 * top 3 competitors, win-rate analytics, tier badges, search filtering,
 * AI Model Matchmaker workload advisor, and live refresh capabilities.
 */
export function LeaderboardPage({ onNavigate }) {
  const [selectedLbCategory, setSelectedLbCategory] = useState('All');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('elo');
  const [highlightedModelId, setHighlightedModelId] = useState(null);

  const handleHighlightModel = (databaseId, modelId, modelName) => {
    setSearchQuery('');
    const target = leaderboard.find(
      (m) =>
        (databaseId && m.id === databaseId) ||
        (modelId && m.modelId === modelId) ||
        (modelName && m.name.toLowerCase() === modelName.toLowerCase())
    );
    const targetId = target ? target.id : databaseId;

    if (targetId) {
      setHighlightedModelId(targetId);
      setTimeout(() => {
        const rowElem = document.getElementById(`model-row-${targetId}`);
        if (rowElem) {
          rowElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);

      setTimeout(() => {
        setHighlightedModelId((prev) => (prev === targetId ? null : prev));
      }, 5000);
    }
  };

  useEffect(() => {
    fetchLeaderboard(selectedLbCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLbCategory]);

  const fetchLeaderboard = async (category, isManual = false) => {
    setLoadingLb(true);
    setError(null);
    try {
      const data = await getLeaderboard(category);
      setLeaderboard(Array.isArray(data) ? data : []);
      if (isManual) {
        addToast(`Refreshed ${category} leaderboard ratings`, 'info');
      }
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoadingLb(false);
    }
  };

  // Derived statistics for the KPI Strip
  const totalBattlesCount = leaderboard.reduce(
    (acc, m) => acc + (m.totalBattles || 0),
    0
  );
  // Each 1v1 battle records 1 battle for each model, so total unique battles is totalBattlesCount / 2
  const uniqueBattlesEstimated = Math.ceil(totalBattlesCount / 2);

  const topModel = leaderboard.length > 0 ? leaderboard[0] : null;

  // Best win rate among models with battles
  const modelsWithBattles = leaderboard.filter((m) => (m.totalBattles || 0) > 0);
  const bestWinRateModel = modelsWithBattles.length > 0
    ? [...modelsWithBattles].sort((a, b) => {
        const rateA = a.wins / a.totalBattles;
        const rateB = b.wins / b.totalBattles;
        return rateB - rateA;
      })[0]
    : null;

  const bestWinRatePercent = bestWinRateModel
    ? Math.round((bestWinRateModel.wins / bestWinRateModel.totalBattles) * 100)
    : 0;

  // Filter and sort models for table
  const filteredModels = leaderboard.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'elo') return (b.elo || 0) - (a.elo || 0);
    if (sortBy === 'winRate') {
      const rateA = a.totalBattles > 0 ? a.wins / a.totalBattles : 0;
      const rateB = b.totalBattles > 0 ? b.wins / b.totalBattles : 0;
      return rateB - rateA;
    }
    if (sortBy === 'battles') return (b.totalBattles || 0) - (a.totalBattles || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  // Helper for tier badge
  const getTier = (elo) => {
    if (elo >= 1040) return { label: 'Grandmaster', icon: '👑', className: 'tier-grandmaster' };
    if (elo >= 1000) return { label: 'Master', icon: '⭐', className: 'tier-master' };
    if (elo >= 960) return { label: 'Diamond', icon: '💎', className: 'tier-diamond' };
    return { label: 'Challenger', icon: '⚔️', className: 'tier-challenger' };
  };

  // Podium models (top 3 from original leaderboard)
  const podiumTop3 = leaderboard.slice(0, 3);

  return (
    <div className="leaderboard-page-container">
      {/* ── 1. Leaderboard Hero Deck ── */}
      <div className="leaderboard-hero-card">
        <div className="leaderboard-badge">
          <span className="live-dot"></span>
          <span>GLOBAL COMPETITIVE STANDINGS • LIVE ELO RATINGS</span>
        </div>
        <h2 className="leaderboard-hero-title">
          Community Elo Leaderboard <span className="gradient-text">&amp; Model Tiers</span>
        </h2>
        <p className="leaderboard-hero-subtitle">
          Official head-to-head Elo rating rankings derived from blind community human evaluations and automated AI judging.
        </p>

        {/* KPI Summary Strip */}
        <div className="leaderboard-kpi-strip">
          <div className="leaderboard-kpi-card kpi-champion">
            <div className="kpi-icon-box">🏆</div>
            <div className="kpi-text-block">
              <span className="kpi-label">Arena Champion</span>
              <span className="kpi-value" title={topModel ? topModel.name : 'Awaiting Data'}>
                {topModel ? topModel.name : 'Awaiting Data'}
              </span>
              <span className="kpi-caption" title={topModel ? `Elo ${topModel.elo} · Rank #1` : 'No matches'}>
                {topModel ? `Elo ${topModel.elo} · Rank #1` : 'No matches'}
              </span>
            </div>
          </div>

          <div className="leaderboard-kpi-card kpi-battles">
            <div className="kpi-icon-box">⚔️</div>
            <div className="kpi-text-block">
              <span className="kpi-label">Completed Battles</span>
              <span className="kpi-value" title={`${uniqueBattlesEstimated} Matches (${totalBattlesCount} evaluations)`}>
                {uniqueBattlesEstimated} Matches
              </span>
              <span className="kpi-caption">{totalBattlesCount} total evaluations</span>
            </div>
          </div>

          <div className="leaderboard-kpi-card kpi-models">
            <div className="kpi-icon-box">🤖</div>
            <div className="kpi-text-block">
              <span className="kpi-label">Evaluated Models</span>
              <span className="kpi-value" title={`${leaderboard.length} Tier-ranked Contenders`}>
                {leaderboard.length} Models
              </span>
              <span className="kpi-caption">Tier-ranked LLMs</span>
            </div>
          </div>

          <div className="leaderboard-kpi-card kpi-winrate">
            <div className="kpi-icon-box">🎯</div>
            <div className="kpi-text-block">
              <span className="kpi-label">Peak Win Rate</span>
              <span className="kpi-value">
                {bestWinRateModel ? `${bestWinRatePercent}%` : 'N/A'}
              </span>
              <span className="kpi-caption" title={bestWinRateModel ? bestWinRateModel.name : 'Pending battles'}>
                {bestWinRateModel ? bestWinRateModel.name : 'Pending battles'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Top 3 Podium Showcase (Displayed when >= 3 models exist) ── */}
      {podiumTop3.length >= 3 && !loadingLb && (
        <div className="leaderboard-podium-section">
          <div className="podium-header-label">
            <span>👑 REIGNING PODIUM CONTENDERS</span>
          </div>

          <div className="leaderboard-podium-grid">
            {/* Rank 2: Silver */}
            {podiumTop3[1] && (
              <div className="podium-card podium-rank-2">
                <div className="podium-medal-crown">🥈</div>
                <span className="podium-pill-tag tag-silver">#2 CONTENDER</span>
                <div className="podium-model-name" title={podiumTop3[1].name}>
                  {podiumTop3[1].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number">{podiumTop3[1].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate" style={{ color: '#94a3b8' }}>
                    {podiumTop3[1].totalBattles > 0
                      ? `${Math.round((podiumTop3[1].wins / podiumTop3[1].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[1].wins}W - {podiumTop3[1].losses}L
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1: Gold (Center Elevated) */}
            {podiumTop3[0] && (
              <div className="podium-card podium-rank-1">
                <div className="podium-medal-crown">👑</div>
                <span className="podium-pill-tag tag-gold">#1 ARENA CHAMPION</span>
                <div className="podium-model-name" title={podiumTop3[0].name}>
                  {podiumTop3[0].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number">{podiumTop3[0].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate" style={{ color: '#fbbf24' }}>
                    {podiumTop3[0].totalBattles > 0
                      ? `${Math.round((podiumTop3[0].wins / podiumTop3[0].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[0].wins}W - {podiumTop3[0].losses}L
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3: Bronze */}
            {podiumTop3[2] && (
              <div className="podium-card podium-rank-3">
                <div className="podium-medal-crown">🥉</div>
                <span className="podium-pill-tag tag-bronze">#3 PODIUM</span>
                <div className="podium-model-name" title={podiumTop3[2].name}>
                  {podiumTop3[2].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number">{podiumTop3[2].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate" style={{ color: '#f59e0b' }}>
                    {podiumTop3[2].totalBattles > 0
                      ? `${Math.round((podiumTop3[2].wins / podiumTop3[2].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[2].wins}W - {podiumTop3[2].losses}L
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2.5. AI Model Matchmaker Workload Advisor ── */}
      <ModelMatchmaker
        onHighlightModel={handleHighlightModel}
        onNavigate={onNavigate}
      />

      {/* ── 3. Filters, Search & Action Controls ── */}
      <div className="leaderboard-controls-card">
        <div className="controls-top-row">
          {/* Domain Category Filter */}
          <div className="category-filter-group">
            {LB_CATEGORIES.map((cat) => {
              const icon = cat === 'All' ? '🌐' : CATEGORY_ICONS[cat] || '🏷️';
              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-filter-pill ${selectedLbCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedLbCategory(cat)}
                  disabled={loadingLb}
                >
                  <span>{icon}</span>
                  <span>{cat === 'All' ? 'All Domains' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Refresh Action */}
          <div className="controls-actions-group">
            <div className="search-input-wrapper">
              <span className="search-icon-inside">🔍</span>
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="leaderboard-search-input"
              />
            </div>

            <button
              type="button"
              className="leaderboard-refresh-btn"
              onClick={() => fetchLeaderboard(selectedLbCategory, true)}
              disabled={loadingLb}
            >
              {loadingLb ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Refresh Standings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Error Alert ── */}
      {error && (
        <div className="playground-error-card">
          <span className="error-icon">⚠️</span>
          <div className="error-body">
            <strong>Leaderboard Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── 5. Main Rankings Table Card ── */}
      <div className="leaderboard-table-card">
        {loadingLb && (
          <div className="leaderboard-loading-box">
            <div className="spinner-large"></div>
            <p>Retrieving {selectedLbCategory} tier standings and Elo matrix...</p>
          </div>
        )}

        {!loadingLb && sortedModels.length === 0 && (
          <div className="leaderboard-empty-box">
            <span style={{ fontSize: '2.5rem' }}>📭</span>
            <h3>No Models Found</h3>
            <p>
              {searchQuery
                ? `No models match "${searchQuery}". Try clearing your search filter.`
                : `No battles recorded yet in the ${selectedLbCategory} category.`}
            </p>
          </div>
        )}

        {!loadingLb && sortedModels.length > 0 && (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Model Architecture</th>
                <th style={{ width: '150px' }}>Tier Badge</th>
                <th
                  style={{ width: '130px', cursor: 'pointer' }}
                  onClick={() => setSortBy('elo')}
                  title="Click to sort by Elo"
                >
                  Arena Elo {sortBy === 'elo' ? '▼' : ''}
                </th>
                <th
                  style={{ width: '180px', cursor: 'pointer' }}
                  onClick={() => setSortBy('winRate')}
                  title="Click to sort by Win Rate"
                >
                  Win Rate {sortBy === 'winRate' ? '▼' : ''}
                </th>
                <th style={{ width: '190px' }}>Record (W / L / T)</th>
                <th
                  style={{ width: '130px', cursor: 'pointer' }}
                  onClick={() => setSortBy('battles')}
                  title="Click to sort by Total Battles"
                >
                  Battles {sortBy === 'battles' ? '▼' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model, idx) => {
                const total = (model.wins || 0) + (model.losses || 0) + (model.ties || 0);
                const winRate = total > 0 ? Math.round((model.wins / total) * 100) : 0;
                const tier = getTier(model.elo);
                const isChampion = idx === 0 && sortBy === 'elo' && !searchQuery;

                // Rank badge styling
                let rankContent = `#${idx + 1}`;
                let rankClass = 'rank-default';
                if (idx === 0) {
                  rankContent = '🥇';
                  rankClass = 'rank-gold';
                } else if (idx === 1) {
                  rankContent = '🥈';
                  rankClass = 'rank-silver';
                } else if (idx === 2) {
                  rankContent = '🥉';
                  rankClass = 'rank-bronze';
                }

                // Win rate fill class
                const fillClass = winRate >= 60 ? 'fill-high' : winRate >= 35 ? 'fill-med' : 'fill-low';
                const rateColor = winRate >= 60 ? '#34d399' : winRate >= 35 ? '#fbbf24' : '#f87171';

                const isHighlighted = highlightedModelId === model.id;
                const providerText = model.provider
                  ? model.provider.toLowerCase() === 'groq'
                    ? '⚡ Groq LPU'
                    : model.provider.toLowerCase() === 'gemini'
                    ? '♊ Google DeepMind'
                    : '🌐 OpenRouter'
                  : 'Verified Model';

                return (
                  <tr
                    key={model.id || idx}
                    id={`model-row-${model.id}`}
                    className={`${isChampion ? 'row-champion' : ''} ${isHighlighted ? 'row-matchmaker-highlight' : ''}`}
                  >
                    {/* Rank */}
                    <td>
                      <div className="rank-badge-cell">
                        <div className={`rank-pill ${rankClass}`}>{rankContent}</div>
                      </div>
                    </td>

                    {/* Model Info */}
                    <td>
                      <div className="model-info-cell">
                        <div className="model-name-title">
                          <span>{model.name}</span>
                          {isChampion && <span className="champion-crown-tag">👑 #1</span>}
                          {isHighlighted && <span className="matchmaker-focus-tag">🎯 MATCH</span>}
                        </div>
                        <div className="model-provider-sub">
                          {providerText} · ID: {model.id}
                        </div>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td>
                      <span className={`tier-badge ${tier.className}`}>
                        <span>{tier.icon}</span>
                        <span>{tier.label}</span>
                      </span>
                    </td>

                    {/* Elo Value */}
                    <td>
                      <span className="elo-cell-value">{model.elo}</span>
                    </td>

                    {/* Win Rate & Progress Bar */}
                    <td>
                      <div className="winrate-cell-block">
                        <div className="winrate-header-row">
                          <span style={{ color: rateColor }}>{winRate}%</span>
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                            {model.wins}/{total}
                          </span>
                        </div>
                        <div className="winrate-track">
                          <div
                            className={`winrate-fill ${fillClass}`}
                            style={{ width: `${Math.max(winRate, 4)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Record Badges */}
                    <td>
                      <div className="record-cell-block">
                        <span className="record-badge badge-wins">{model.wins || 0}W</span>
                        <span className="record-badge badge-losses">{model.losses || 0}L</span>
                        <span className="record-badge badge-ties">{model.ties || 0}T</span>
                      </div>
                    </td>

                    {/* Total Battles */}
                    <td>
                      <span className="battles-total-badge">{model.totalBattles || 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
