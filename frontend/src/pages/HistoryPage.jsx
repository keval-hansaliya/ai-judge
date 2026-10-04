import { useState, useEffect, useCallback } from 'react';
import { getBattles, getBattleById, deleteBattle, getBattleStats } from '../api.js';
import { addToast } from '../components/Toast.jsx';
import { FormattedResponse } from '../components/FormattedResponse.jsx';
import { LB_CATEGORIES, CATEGORY_ICONS } from '../constants.js';
import './HistoryPage.css';

/**
 * Format ISO date string into human-readable local time
 */
function formatDate(isoStr) {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

export function HistoryPage({ currentUser }) {
  // ── State: Data & Filtering ──
  const [battles, setBattles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWinner, setSelectedWinner] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // ── State: Modal & Actions ──
  const [activeModalBattle, setActiveModalBattle] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ── Fetch Personal Statistics ──
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getBattleStats();
      setStats(data);
    } catch (err) {
      console.warn('Could not load battle statistics:', err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch Battle Timeline ──
  const fetchBattleList = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const data = await getBattles({
        page: targetPage,
        limit: 10,
        category: selectedCategory,
        winner: selectedWinner === 'ALL' ? undefined : selectedWinner,
        search: searchQuery
      });
      setBattles(data.battles || []);
      setPagination(data.pagination || { total: 0, page: targetPage, limit: 10, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load battle history:', err);
      addToast(err.message || 'Failed to load battle history', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, selectedWinner, searchQuery]);

  // Initial load or user change
  useEffect(() => {
    fetchStats();
  }, [fetchStats, currentUser?.id]);

  useEffect(() => {
    fetchBattleList(page);
  }, [page, selectedCategory, selectedWinner, fetchBattleList, currentUser?.id]);

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBattleList(1);
  };

  // Handle Category Change
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  // Handle Winner Filter Change
  const handleWinnerChange = (w) => {
    setSelectedWinner(w);
    setPage(1);
  };

  // ── Open Replay Modal ──
  const handleOpenReplay = async (battle) => {
    try {
      setLoadingModal(true);
      // Fetch full battle details with complete turns
      const fullDetails = await getBattleById(battle.id);
      setActiveModalBattle(fullDetails);
    } catch (err) {
      console.error('Failed to fetch battle detail:', err);
      addToast('Failed to load replay conversation', 'error');
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Delete Battle Record ──
  const handleDeleteBattle = async (e, battleId) => {
    e.stopPropagation();
    if (!window.confirm(`Delete battle record #${battleId} from your history?`)) {
      return;
    }

    try {
      setDeletingId(battleId);
      await deleteBattle(battleId);
      addToast(`Battle #${battleId} deleted from history`, 'success');
      // Refresh timeline and stats
      fetchBattleList(page);
      fetchStats();
      if (activeModalBattle?.id === battleId) {
        setActiveModalBattle(null);
      }
    } catch (err) {
      console.error('Failed to delete battle:', err);
      addToast(err.message || 'Failed to delete battle', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Calculations for preference bar
  const totalVotesCast = (stats?.votesDistribution?.modelA || 0) +
                         (stats?.votesDistribution?.modelB || 0) +
                         (stats?.votesDistribution?.tie || 0);

  const pctA = totalVotesCast > 0 ? ((stats?.votesDistribution?.modelA || 0) / totalVotesCast) * 100 : 33.3;
  const pctB = totalVotesCast > 0 ? ((stats?.votesDistribution?.modelB || 0) / totalVotesCast) * 100 : 33.3;
  const pctTie = totalVotesCast > 0 ? ((stats?.votesDistribution?.tie || 0) / totalVotesCast) * 100 : 33.4;

  return (
    <div className="history-page-container">
      {/* ── 1. Hero Header & Personal Analytics KPI Strip ── */}
      <section className="history-hero-card">
        <div className="history-badge">
          <span>📜</span> PERSONAL BATTLE VAULT &amp; METRICS
        </div>
        <h1 className="history-hero-title">Evaluation History &amp; Decision Matrix</h1>
        <p className="history-hero-subtitle">
          Audit every head-to-head match, analyze your model preference tendencies, and inspect full turn-by-turn prompt responses.
        </p>

        {/* KPI Strip */}
        <div className="history-kpi-strip">
          {/* KPI 1: Total Battles */}
          <div className="history-kpi-card kpi-total">
            <div className="hist-icon-box">⚔️</div>
            <div className="hist-text-block">
              <span className="hist-label">Total Battles</span>
              <span className="hist-value">{statsLoading ? '...' : (stats?.totalBattles || 0)}</span>
              <span className="hist-caption">Across all evaluation categories</span>
            </div>
          </div>

          {/* KPI 2: Voted Decisions */}
          <div className="history-kpi-card kpi-voted">
            <div className="hist-icon-box">⚖️</div>
            <div className="hist-text-block">
              <span className="hist-label">Decisions Cast</span>
              <span className="hist-value">
                {statsLoading ? '...' : `${stats?.votedBattles || 0} / ${stats?.totalBattles || 0}`}
              </span>
              <span className="hist-caption">
                {stats?.totalBattles > 0
                  ? `${Math.round(((stats?.votedBattles || 0) / stats.totalBattles) * 100)}% decision rate`
                  : 'No battles yet'}
              </span>
            </div>
          </div>

          {/* KPI 3: Favorite Category */}
          <div className="history-kpi-card kpi-favorite">
            <div className="hist-icon-box">
              {CATEGORY_ICONS[stats?.favoriteCategory] || '🎯'}
            </div>
            <div className="hist-text-block">
              <span className="hist-label">Favorite Domain</span>
              <span className="hist-value">{statsLoading ? '...' : (stats?.favoriteCategory || 'General')}</span>
              <span className="hist-caption">Most frequent test category</span>
            </div>
          </div>

          {/* KPI 4: Voting Split */}
          <div className="history-kpi-card kpi-ratio">
            <div className="hist-icon-box">📊</div>
            <div className="hist-text-block">
              <span className="hist-label">Vote Split (A / B / Tie)</span>
              <span className="hist-value" style={{ fontSize: '1.05rem' }}>
                {statsLoading
                  ? '...'
                  : `${stats?.votesDistribution?.modelA || 0}A · ${stats?.votesDistribution?.modelB || 0}B · ${stats?.votesDistribution?.tie || 0}T`}
              </span>
              <div className="ratio-bar-track" title={`Model A: ${Math.round(pctA)}% | Model B: ${Math.round(pctB)}% | Ties: ${Math.round(pctTie)}%`}>
                <div className="ratio-fill-a" style={{ width: `${pctA}%` }} />
                <div className="ratio-fill-b" style={{ width: `${pctB}%` }} />
                <div className="ratio-fill-tie" style={{ width: `${pctTie}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Filters & Search Controls Deck ── */}
      <section className="history-controls-card">
        {/* Category Filters */}
        <div className="history-filters-row">
          <div className="history-category-pills">
            {LB_CATEGORIES.map((cat) => {
              const icon = cat === 'All' ? '🌐' : CATEGORY_ICONS[cat] || '🏷️';
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`history-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Live Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="history-search-input"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="history-filter-pill active"
              style={{ padding: '8px 16px', borderRadius: '10px' }}
            >
              🔍 Filter
            </button>
          </form>
        </div>

        {/* Winner Filter Row */}
        <div className="history-filters-row" style={{ paddingTop: '8px', borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
          <div className="history-status-pills">
            <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
              OUTCOME:
            </span>
            {[
              { id: 'ALL', label: 'All Results' },
              { id: 'A', label: '🏆 Model A Won' },
              { id: 'B', label: '🏆 Model B Won' },
              { id: 'TIE', label: '🤝 Tie / Draw' },
              { id: 'unvoted', label: '⏳ Unvoted' }
            ].map((st) => {
              const isActive = selectedWinner === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  className={`history-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleWinnerChange(st.id)}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="history-filter-pill"
            style={{ fontSize: '0.78rem' }}
            onClick={() => {
              fetchBattleList(page);
              fetchStats();
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </section>

      {/* ── 3. Battle Cards Timeline ── */}
      <section className="history-cards-timeline">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div className="brand-pulse-ring" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: '600' }}>Loading your battle records...</p>
          </div>
        ) : battles.length === 0 ? (
          <div className="battle-history-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
            <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: '1.2rem' }}>No Battles Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 18px' }}>
              {searchQuery || selectedCategory !== 'All' || selectedWinner !== 'ALL'
                ? 'No battle records matched your search filters. Try clearing filters.'
                : 'You have not conducted any battles yet. Enter the Arena to run your first 1v1 battle!'}
            </p>
            {(searchQuery || selectedCategory !== 'All' || selectedWinner !== 'ALL') && (
              <button
                type="button"
                className="history-filter-pill active"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedWinner('ALL');
                  setSearchQuery('');
                  setPage(1);
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          battles.map((battle) => {
            const isVoted = battle.winner !== null;
            let winnerBadgeClass = 'badge-unvoted';
            let winnerLabel = '⏳ Unvoted';

            if (battle.winner === 'A') {
              winnerBadgeClass = 'badge-won-a';
              winnerLabel = '🏆 Model A Won';
            } else if (battle.winner === 'B') {
              winnerBadgeClass = 'badge-won-b';
              winnerLabel = '🏆 Model B Won';
            } else if (battle.winner === 'TIE') {
              winnerBadgeClass = 'badge-won-tie';
              winnerLabel = '🤝 Tie / Draw';
            }

            return (
              <div key={battle.id} className="battle-history-card">
                {/* Top Meta Line */}
                <div className="card-top-meta">
                  <div className="meta-tags-group">
                    <span className="hist-category-tag">
                      {CATEGORY_ICONS[battle.category] || '🌐'} {battle.category}
                    </span>
                    <span className="hist-turn-tag">
                      {battle.turnCount || 1} {(battle.turnCount || 1) === 1 ? 'Turn' : 'Turns'}
                    </span>
                    <span className="hist-date-stamp">
                      {formatDate(battle.createdAt)}
                    </span>
                  </div>

                  <span className={`hist-winner-badge ${winnerBadgeClass}`}>
                    {winnerLabel}
                  </span>
                </div>

                {/* Prompt Preview Block */}
                <div className="card-prompt-quote">
                  <span style={{ color: '#818cf8', fontWeight: '700', marginRight: '6px' }}>Prompt:</span>
                  &ldquo;{battle.prompt}&rdquo;
                </div>

                {/* Matchup & Action Dock */}
                <div className="card-matchup-row">
                  <div className="competitors-preview-dock">
                    <div className="competitor-pill competitor-a">
                      <span>🤖</span>
                      <span>
                        {isVoted ? `${battle.modelA?.provider || ''} / ${battle.modelA?.name || 'Model A'}` : 'Model A (Blind)'}
                      </span>
                    </div>

                    <span className="matchup-vs">VS</span>

                    <div className="competitor-pill competitor-b">
                      <span>⚡</span>
                      <span>
                        {isVoted ? `${battle.modelB?.provider || ''} / ${battle.modelB?.name || 'Model B'}` : 'Model B (Blind)'}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions-dock">
                    <button
                      type="button"
                      className="btn-view-replay"
                      onClick={() => handleOpenReplay(battle)}
                      disabled={loadingModal}
                    >
                      <span>🔍</span>
                      <span>Replay &amp; Audit</span>
                    </button>

                    <button
                      type="button"
                      className="btn-delete-battle"
                      title="Delete battle record"
                      onClick={(e) => handleDeleteBattle(e, battle.id)}
                      disabled={deletingId === battle.id}
                    >
                      {deletingId === battle.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ── 4. Pagination Controls ── */}
        {pagination.totalPages > 1 && (
          <div className="history-pagination-dock">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="pagination-page-indicator">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} battles)
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* ── 5. Conversation Replay & Audit Modal ── */}
      {activeModalBattle && (
        <div className="modal-overlay-backdrop" onClick={() => setActiveModalBattle(null)}>
          <div className="replay-modal-window" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-bar">
              <div className="modal-title-left">
                <span style={{ fontSize: '1.4rem' }}>⚔️</span>
                <div>
                  <div className="modal-title-text">
                    Battle #{activeModalBattle.id} Transcript Replay
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span>{CATEGORY_ICONS[activeModalBattle.category] || '🌐'} {activeModalBattle.category}</span>
                    <span>•</span>
                    <span>{formatDate(activeModalBattle.createdAt)}</span>
                    <span>•</span>
                    <span style={{ color: activeModalBattle.winner === 'A' ? '#00f0ff' : activeModalBattle.winner === 'B' ? '#d946ef' : '#fbbf24', fontWeight: '700' }}>
                      {activeModalBattle.winner === 'A' ? 'Model A Won' : activeModalBattle.winner === 'B' ? 'Model B Won' : activeModalBattle.winner === 'TIE' ? 'Tie' : 'Unvoted'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModalBattle(null)}
                aria-label="Close Replay Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Multi-turn comparison */}
            <div className="modal-body-scrollable">
              {Array.isArray(activeModalBattle.turns) && activeModalBattle.turns.length > 0 ? (
                activeModalBattle.turns.map((turn, idx) => (
                  <div key={idx} className="replay-turn-container">
                    {/* Turn Prompt Banner */}
                    <div className="replay-prompt-banner">
                      <span className="turn-pill-small">Turn {turn.turn || idx + 1}</span>
                      <strong style={{ color: '#f8fafc', fontSize: '0.92rem' }}>Prompt: </strong>
                      <span style={{ color: '#e2e8f0', fontSize: '0.92rem' }}>{turn.prompt}</span>
                    </div>

                    {/* Side-by-Side Responses */}
                    <div className="replay-grid">
                      {/* Model A Response */}
                      <div className="model-panel panel-a" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(0, 240, 255, 0.15)' }}>
                          <span style={{ color: '#00f0ff', fontWeight: '800', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🤖</span> Model A {activeModalBattle.winner === 'A' && '🏆 (Winner)'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {activeModalBattle.modelA?.provider} / {activeModalBattle.modelA?.name}
                          </span>
                        </div>
                        <FormattedResponse text={turn.responseA} isStreaming={false} />
                      </div>

                      {/* Model B Response */}
                      <div className="model-panel panel-b" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(217, 70, 239, 0.25)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(217, 70, 239, 0.15)' }}>
                          <span style={{ color: '#d946ef', fontWeight: '800', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>⚡</span> Model B {activeModalBattle.winner === 'B' && '🏆 (Winner)'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {activeModalBattle.modelB?.provider} / {activeModalBattle.modelB?.name}
                          </span>
                        </div>
                        <FormattedResponse text={turn.responseB} isStreaming={false} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="replay-grid">
                  <div className="model-panel panel-a" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ marginBottom: '10px', color: '#00f0ff', fontWeight: '800' }}>
                      Model A ({activeModalBattle.modelA?.name})
                    </div>
                    <FormattedResponse text={activeModalBattle.responseA} isStreaming={false} />
                  </div>
                  <div className="model-panel panel-b" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(217, 70, 239, 0.25)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ marginBottom: '10px', color: '#d946ef', fontWeight: '800' }}>
                      Model B ({activeModalBattle.modelB?.name})
                    </div>
                    <FormattedResponse text={activeModalBattle.responseB} isStreaming={false} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
