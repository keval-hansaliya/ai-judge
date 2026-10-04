/**
 * ResultBanner — shown after human vote is cast.
 * Reveals mystery model identities with head-to-head Elo rating cards.
 *
 * Props:
 *  - voteResult: { winner, modelA, modelB }
 *    modelA/modelB: { name, oldElo, newElo }
 *  - onNextBattle: () => void
 */
export function ResultBanner({ voteResult, onNextBattle }) {
  if (!voteResult) return null;

  const isTie = voteResult.winner === 'TIE';
  const winnerName =
    voteResult.winner === 'A'
      ? voteResult.modelA.name
      : voteResult.winner === 'B'
      ? voteResult.modelB.name
      : null;

  const deltaA = voteResult.modelA.newElo - voteResult.modelA.oldElo;
  const deltaB = voteResult.modelB.newElo - voteResult.modelB.oldElo;

  return (
    <div className="result-reveal-card">
      {/* Top Banner */}
      <div className="result-reveal-header">
        <div className="reveal-badge-wrap">
          <span className="reveal-celebrate-badge">🎉 IDENTITIES UNVEILED</span>
          <span className="reveal-sub-badge">Elo Updated</span>
        </div>
        <h3 className="reveal-winner-title">
          {isTie ? (
            <span>🤝 Standoff: It's a Tie!</span>
          ) : (
            <span>
              🏆 Victory: <strong className="winner-highlight">{winnerName}</strong>
            </span>
          )}
        </h3>
        <p className="reveal-instructions">
          Blind evaluation complete! Check out the Elo rating shift below and initiate your next matchup.
        </p>
      </div>

      {/* Head-to-Head Cards */}
      <div className="reveal-models-deck">
        {/* Model A Card */}
        <div className={`reveal-competitor-card ${voteResult.winner === 'A' ? 'is-winner' : ''}`}>
          <div className="competitor-corner-tag tag-a">
            {voteResult.winner === 'A' ? '👑 WINNER · MODEL A' : 'MODEL A'}
          </div>
          <h4 className="competitor-real-name">{voteResult.modelA.name}</h4>
          <div className="competitor-elo-stats">
            <div className="elo-metric">
              <span className="elo-label">Rating</span>
              <span className="elo-current">{voteResult.modelA.newElo}</span>
            </div>
            <div className={`elo-delta-tag ${deltaA >= 0 ? 'delta-up' : 'delta-down'}`}>
              {deltaA >= 0 ? `+${deltaA} ↗` : `${deltaA} ↘`}
            </div>
          </div>
        </div>

        {/* VS emblem */}
        <div className="reveal-vs-emblem">VS</div>

        {/* Model B Card */}
        <div className={`reveal-competitor-card ${voteResult.winner === 'B' ? 'is-winner' : ''}`}>
          <div className="competitor-corner-tag tag-b">
            {voteResult.winner === 'B' ? '👑 WINNER · MODEL B' : 'MODEL B'}
          </div>
          <h4 className="competitor-real-name">{voteResult.modelB.name}</h4>
          <div className="competitor-elo-stats">
            <div className="elo-metric">
              <span className="elo-label">Rating</span>
              <span className="elo-current">{voteResult.modelB.newElo}</span>
            </div>
            <div className={`elo-delta-tag ${deltaB >= 0 ? 'delta-up' : 'delta-down'}`}>
              {deltaB >= 0 ? `+${deltaB} ↗` : `${deltaB} ↘`}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="reveal-action-footer">
        <button type="button" className="next-battle-btn" onClick={onNextBattle}>
          <span>⚡ Start Next Battle</span>
        </button>
      </div>
    </div>
  );
}
