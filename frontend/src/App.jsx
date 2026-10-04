import { useState } from 'react';
import { ArenaPage } from './pages/ArenaPage.jsx';
import { PlaygroundPage } from './pages/PlaygroundPage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { BenchmarkReport } from './components/BenchmarkReport.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { useAuth } from './hooks/useAuth.js';
import './NavBar.css';
import './App.css';

/**
 * Tab definitions with rich icons, micro-tags, and unique theme keys.
 */
const NAV_TABS = [
  {
    id: 'arena',
    label: 'Arena Battle',
    icon: '⚔️',
    tag: 'Blind 1v1',
  },
  {
    id: 'benchmark',
    label: 'Benchmark Report',
    icon: '📊',
    tag: 'Standardized',
  },
  {
    id: 'playground',
    label: 'Named Playground',
    icon: '🧪',
    tag: 'Direct Lab',
  },
  {
    id: 'leaderboard',
    label: 'Elo Leaderboard',
    icon: '🏆',
    tag: 'Rankings',
  },
  {
    id: 'history',
    label: 'Battle History',
    icon: '📜',
    tag: 'Audit Vault',
  },
];

/**
 * App — top-level shell.
 *
 * Responsibilities:
 *  - Render the futuristic site header & navigation dock
 *  - Manage the activeTab state
 *  - Manage persistent user authentication and login dialog
 *  - Route to the correct page component
 *  - Mount global ToastContainer and AuthModal
 */
function App() {
  const [activeTab, setActiveTab] = useState('arena');
  const {
    user,
    isGuest,
    isAuthModalOpen,
    authMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout
  } = useAuth();

  return (
    <div className="app-container">
      {/* Global toast notification layer */}
      <ToastContainer />

      {/* Global authentication modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authMode}
        onLogin={login}
        onRegister={register}
      />

      {/* ── Modern Futuristic Header & Nav Dock ── */}
      <header className="app-header-shell">
        {/* Top Row: Brand & Live Engine Indicators */}
        <div className="header-top-row">
          <div className="brand-lockup">
            <div className="brand-logo-emblem">
              <span className="brand-icon">⚔️</span>
              <span className="brand-pulse-ring"></span>
            </div>
            <div className="brand-text-group">
              <div className="brand-title-row">
                <span className="brand-title">LM ARENA</span>
                <span className="brand-badge-pill">AI JUDGE v2.4</span>
              </div>
              <span className="brand-tagline">
                Autonomous LLM Evaluation, Benchmarking &amp; Community Elo Matrix
              </span>
            </div>
          </div>

          {/* Engine / Model Live Badges & User Auth Group */}
          <div className="header-meta-pills">
            <div className="status-indicator-pill">
              <span className="pulse-dot green"></span>
              <span className="status-label">OpenRouter Connected</span>
            </div>
            <div className="status-indicator-pill">
              <span className="pulse-dot cyan"></span>
              <span className="status-label">Multi-Provider Active</span>
            </div>

            {/* User Identity & Auth Trigger */}
            <div className="header-auth-group">
              {!isGuest && user ? (
                <>
                  <div className="header-user-profile" title={user.email}>
                    <div className="user-avatar-badge">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="user-info-text">
                      <span className="user-name-title">{user.name}</span>
                      <span className="user-status-sub">Verified Evaluator</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="header-logout-btn"
                    onClick={logout}
                    title="Sign out of account"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="status-indicator-pill" style={{ opacity: 0.9 }}>
                    <span style={{ fontSize: '0.86rem' }}>👤</span>
                    <span className="status-label">Guest Mode</span>
                  </div>
                  <button
                    type="button"
                    className="header-auth-btn"
                    onClick={() => openAuthModal('login')}
                  >
                    <span>🔐</span>
                    <span>Sign In</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Segmented Tab Dock */}
        <nav className="nav-tabs-dock" aria-label="Main Navigation">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-dock-tab tab-${tab.id} ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <div className="tab-label-group">
                  <span className="tab-title">{tab.label}</span>
                  <span className="tab-micro-tag">{tab.tag}</span>
                </div>
                {isActive && <span className="tab-active-glow"></span>}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Page Routing with Smooth View Render ── */}
      <main className="page-view" key={activeTab}>
        {activeTab === 'arena' && <ArenaPage />}
        {activeTab === 'benchmark' && <BenchmarkReport />}
        {activeTab === 'playground' && <PlaygroundPage />}
        {activeTab === 'leaderboard' && <LeaderboardPage />}
        {activeTab === 'history' && <HistoryPage currentUser={user} />}
      </main>
    </div>
  );
}

export default App;
