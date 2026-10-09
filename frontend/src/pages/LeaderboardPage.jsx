import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api.js';
import { LB_CATEGORIES } from '../constants.js';
import { addToast } from '../components/Toast.jsx';
import { ModelMatchmaker } from '../components/ModelMatchmaker.jsx';
import {
  Trophy,
  Swords,
  Cpu,
  Percent,
  Search,
  RotateCw,
  Crown,
  Target,
  Globe,
  Code2,
  Calculator,
  Brain,
  Palette,
  ArrowUpDown
} from 'lucide-react';
import './LeaderboardPage.css';

const DOMAIN_ICONS = {
  All: Globe,
  General: Globe,
  Coding: Code2,
  Math: Calculator,
  Reasoning: Brain,
  Creative: Palette,
};

/**
 * LeaderboardPage — Community Elo Leaderboard & Model Tiers.
 * Styled in a clean, human-designed developer aesthetic inspired by shadcn/ui.
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
        addToast(`Updated ${category} standings`, 'info');
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
    if (elo >= 1040) return { label: 'Grandmaster', className: 'tier-grandmaster' };
    if (elo >= 1000) return { label: 'Master', className: 'tier-master' };
    if (elo >= 960) return { label: 'Diamond', className: 'tier-diamond' };
    return { label: 'Challenger', className: 'tier-challenger' };
  };

  // Podium models (top 3 from original leaderboard)
  const podiumTop3 = leaderboard.slice(0, 3);

  return (
    <div className="leaderboard-page-container">
      {/* ── 1. Header & Overview Card ── */}
      <div className="leaderboard-hero-card">
        <div className="hero-content-block">
          <div className="leaderboard-badge">
            <span className="live-dot-clean"></span>
            <span>Live Standings</span>
          </div>
          <h2 className="leaderboard-hero-title">Community Elo Leaderboard</h2>
          <p className="leaderboard-hero-subtitle">
            Head-to-head model ratings derived from blind community human evaluations and
            standardized benchmark judge scoring.
          </p>
        </div>

        {/* KPI Strip */}
        <div className="leaderboard-kpi-strip">
          <div className="leaderboard-kpi-card">
            <div className="kpi-icon-wrapper">
              <Trophy className="icon-sm text-zinc-400" />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-label">Top Ranked</span>
              <span className="kpi-value" title={topModel ? topModel.name : 'Awaiting Data'}>
                {topModel ? topModel.name : '—'}
              </span>
              <span className="kpi-caption">
                {topModel ? `Elo ${topModel.elo}` : 'No battles recorded'}
              </span>
            </div>
          </div>

          <div className="leaderboard-kpi-card">
            <div className="kpi-icon-wrapper">
              <Swords className="icon-sm text-zinc-400" />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-label">Evaluated Battles</span>
              <span className="kpi-value">
                {uniqueBattlesEstimated.toLocaleString()}
              </span>
              <span className="kpi-caption">{totalBattlesCount} total evaluations</span>
            </div>
          </div>

          <div className="leaderboard-kpi-card">
            <div className="kpi-icon-wrapper">
              <Cpu className="icon-sm text-zinc-400" />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-label">Active Contenders</span>
              <span className="kpi-value">{leaderboard.length}</span>
              <span className="kpi-caption">Multi-provider pool</span>
            </div>
          </div>

          <div className="leaderboard-kpi-card">
            <div className="kpi-icon-wrapper">
              <Percent className="icon-sm text-zinc-400" />
            </div>
            <div className="kpi-text-block">
              <span className="kpi-label">Peak Win Rate</span>
              <span className="kpi-value">
                {bestWinRateModel ? `${bestWinRatePercent}%` : '—'}
              </span>
              <span className="kpi-caption" title={bestWinRateModel?.name || ''}>
                {bestWinRateModel ? bestWinRateModel.name : 'Pending data'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Top 3 Podium Showcase ── */}
      {podiumTop3.length >= 3 && !loadingLb && (
        <div className="leaderboard-podium-section">
          <div className="podium-section-header">
            <span className="podium-section-label">Top Performers</span>
          </div>

          <div className="leaderboard-podium-grid">
            {/* Rank 2 */}
            {podiumTop3[1] && (
              <div className="podium-card podium-rank-2">
                <div className="podium-rank-pill">#2</div>
                <div className="podium-model-name" title={podiumTop3[1].name}>
                  {podiumTop3[1].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number font-mono">{podiumTop3[1].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate text-muted">
                    {podiumTop3[1].totalBattles > 0
                      ? `${Math.round((podiumTop3[1].wins / podiumTop3[1].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[1].wins}W / {podiumTop3[1].losses}L
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1 (Primary / Elevated) */}
            {podiumTop3[0] && (
              <div className="podium-card podium-rank-1">
                <div className="podium-rank-pill pill-gold">
                  <Crown className="icon-xxs" />
                  <span>#1 Champion</span>
                </div>
                <div className="podium-model-name" title={podiumTop3[0].name}>
                  {podiumTop3[0].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number font-mono">{podiumTop3[0].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate text-emerald">
                    {podiumTop3[0].totalBattles > 0
                      ? `${Math.round((podiumTop3[0].wins / podiumTop3[0].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[0].wins}W / {podiumTop3[0].losses}L
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {podiumTop3[2] && (
              <div className="podium-card podium-rank-3">
                <div className="podium-rank-pill">#3</div>
                <div className="podium-model-name" title={podiumTop3[2].name}>
                  {podiumTop3[2].name}
                </div>
                <div className="podium-elo-display">
                  <span className="podium-elo-number font-mono">{podiumTop3[2].elo}</span>
                  <span className="podium-elo-label">Elo</span>
                </div>
                <div className="podium-stats-strip">
                  <span className="podium-winrate text-muted">
                    {podiumTop3[2].totalBattles > 0
                      ? `${Math.round((podiumTop3[2].wins / podiumTop3[2].totalBattles) * 100)}% Win`
                      : '0% Win'}
                  </span>
                  <span className="podium-battles-count">
                    {podiumTop3[2].wins}W / {podiumTop3[2].losses}L
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2.5. AI Model Matchmaker / Workload Advisor ── */}
      <ModelMatchmaker
        onHighlightModel={handleHighlightModel}
        onNavigate={onNavigate}
      />

      {/* ── 3. Filters & Controls ── */}
      <div className="leaderboard-controls-card">
        <div className="controls-top-row">
          {/* Domain Category Filter */}
          <div className="category-filter-group">
            {LB_CATEGORIES.map((cat) => {
              const Icon = DOMAIN_ICONS[cat] || Globe;
              const isActive = selectedLbCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedLbCategory(cat)}
                  disabled={loadingLb}
                >
                  <Icon className="icon-xs" />
                  <span>{cat === 'All' ? 'All Domains' : cat}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar & Refresh */}
          <div className="controls-actions-group">
            <div className="search-input-wrapper">
              <Search className="search-icon-inside" />
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
              <RotateCw className={`icon-xs ${loadingLb ? 'spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Error Alert ── */}
      {error && (
        <div className="leaderboard-error-card">
          <span>Error loading standings: {error}</span>
        </div>
      )}

      {/* ── 5. Main Rankings Table ── */}
      <div className="leaderboard-table-card">
        {loadingLb && (
          <div className="leaderboard-loading-box">
            <div className="spinner-clean-lg"></div>
            <p>Loading {selectedLbCategory} standings...</p>
          </div>
        )}

        {!loadingLb && sortedModels.length === 0 && (
          <div className="leaderboard-empty-box">
            <h3>No models found</h3>
            <p>
              {searchQuery
                ? `No models match "${searchQuery}". Clear your search query to see all models.`
                : `No recorded battles in the ${selectedLbCategory} category yet.`}
            </p>
          </div>
        )}

        {!loadingLb && sortedModels.length > 0 && (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Rank</th>
                <th>Model Architecture</th>
                <th style={{ width: '130px' }}>Tier</th>
                <th
                  style={{ width: '120px', cursor: 'pointer' }}
                  onClick={() => setSortBy('elo')}
                  title="Sort by Elo"
                >
                  <div className="th-sort-wrapper">
                    <span>Elo</span>
                    <ArrowUpDown className="icon-xxs opacity-60" />
                  </div>
                </th>
                <th
                  style={{ width: '160px', cursor: 'pointer' }}
                  onClick={() => setSortBy('winRate')}
                  title="Sort by Win Rate"
                >
                  <div className="th-sort-wrapper">
                    <span>Win Rate</span>
                    <ArrowUpDown className="icon-xxs opacity-60" />
                  </div>
                </th>
                <th style={{ width: '170px' }}>Record (W/L/T)</th>
                <th
                  style={{ width: '110px', cursor: 'pointer' }}
                  onClick={() => setSortBy('battles')}
                  title="Sort by Total Battles"
                >
                  <div className="th-sort-wrapper">
                    <span>Battles</span>
                    <ArrowUpDown className="icon-xxs opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model, idx) => {
                const total = (model.wins || 0) + (model.losses || 0) + (model.ties || 0);
                const winRate = total > 0 ? Math.round((model.wins / total) * 100) : 0;
                const tier = getTier(model.elo);
                const isChampion = idx === 0 && sortBy === 'elo' && !searchQuery;
                const isHighlighted = highlightedModelId === model.id;

                const providerText = model.provider
                  ? model.provider.toLowerCase() === 'groq'
                    ? 'Groq LPU'
                    : model.provider.toLowerCase() === 'gemini'
                    ? 'Google DeepMind'
                    : 'OpenRouter'
                  : 'Verified Model';

                return (
                  <tr
                    key={model.id || idx}
                    id={`model-row-${model.id}`}
                    className={`${isChampion ? 'row-champion' : ''} ${isHighlighted ? 'row-matchmaker-highlight' : ''}`}
                  >
                    {/* Rank */}
                    <td>
                      <div className="rank-cell-number font-mono">
                        #{idx + 1}
                      </div>
                    </td>

                    {/* Model Info */}
                    <td>
                      <div className="model-info-cell">
                        <div className="model-name-title">
                          <span className="font-semibold">{model.name}</span>
                          {isChampion && <span className="champion-badge-clean">Rank #1</span>}
                          {isHighlighted && (
                            <span className="matchmaker-focus-tag">
                              <Target className="icon-xxs" />
                              <span>Target</span>
                            </span>
                          )}
                        </div>
                        <div className="model-provider-sub">
                          {providerText} <span className="text-zinc-600">·</span> ID: {model.id}
                        </div>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td>
                      <span className={`tier-badge-clean ${tier.className}`}>
                        {tier.label}
                      </span>
                    </td>

                    {/* Elo Value */}
                    <td>
                      <span className="elo-cell-value font-mono font-semibold">
                        {model.elo}
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td>
                      <div className="winrate-cell-block">
                        <div className="winrate-header-row font-mono">
                          <span>{winRate}%</span>
                          <span className="text-zinc-500 font-sans text-xs">
                            {model.wins}/{total}
                          </span>
                        </div>
                        <div className="winrate-track-clean">
                          <div
                            className="winrate-fill-clean"
                            style={{ width: `${Math.max(winRate, 3)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Record */}
                    <td>
                      <div className="record-cell-block font-mono">
                        <span className="record-stat-win">{model.wins || 0}W</span>
                        <span className="record-stat-sep">/</span>
                        <span className="record-stat-loss">{model.losses || 0}L</span>
                        <span className="record-stat-sep">/</span>
                        <span className="record-stat-tie">{model.ties || 0}T</span>
                      </div>
                    </td>

                    {/* Total Battles */}
                    <td>
                      <span className="battles-cell-clean font-mono">
                        {model.totalBattles || 0}
                      </span>
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
