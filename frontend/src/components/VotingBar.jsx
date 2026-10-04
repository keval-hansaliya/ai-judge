/**
 * VotingBar — high-impact three-button human voting deck rendered under battle responses.
 *
 * Props:
 *  - onVote(winner: 'A' | 'B' | 'TIE')
 *  - disabled: bool — true while streaming or vote already cast
 */
export function VotingBar({ onVote, disabled }) {
  return (
    <div className="voting-card">
      <div className="voting-header">
        <div className="voting-badge-row">
          <span className="voting-badge">
            <span className="pulsing-dot-amber"></span> 🗳️ HUMAN EVALUATION
          </span>
          <span className="voting-hint-tag">Updates Global Elo</span>
        </div>
        <h4 className="voting-title">Cast Your Vote to Reveal Model Identities</h4>
        <p className="voting-subtitle">
          Evaluate response depth, accuracy, logic, and style. Once you vote, model names will be revealed and Elo ratings updated.
        </p>
      </div>

      <div className="voting-actions-grid">
        <button
          type="button"
          className="vote-card-btn vote-card-btn--a"
          onClick={() => onVote('A')}
          disabled={disabled}
        >
          <div className="vote-card-top">
            <span className="vote-model-tag tag-a">🔵 MODEL A</span>
            <span className="vote-icon">👈</span>
          </div>
          <div className="vote-card-body">
            <span className="vote-card-label">Model A is Better</span>
            <span className="vote-card-desc">More accurate, detailed, or well structured</span>
          </div>
        </button>

        <button
          type="button"
          className="vote-card-btn vote-card-btn--tie"
          onClick={() => onVote('TIE')}
          disabled={disabled}
        >
          <div className="vote-card-top">
            <span className="vote-model-tag tag-tie">⚖️ NEUTRAL</span>
            <span className="vote-icon">🤝</span>
          </div>
          <div className="vote-card-body">
            <span className="vote-card-label">Tie / Equal Quality</span>
            <span className="vote-card-desc">Both answered identically well or both failed</span>
          </div>
        </button>

        <button
          type="button"
          className="vote-card-btn vote-card-btn--b"
          onClick={() => onVote('B')}
          disabled={disabled}
        >
          <div className="vote-card-top">
            <span className="vote-model-tag tag-b">🟣 MODEL B</span>
            <span className="vote-icon">👉</span>
          </div>
          <div className="vote-card-body">
            <span className="vote-card-label">Model B is Better</span>
            <span className="vote-card-desc">More accurate, detailed, or well structured</span>
          </div>
        </button>
      </div>
    </div>
  );
}
