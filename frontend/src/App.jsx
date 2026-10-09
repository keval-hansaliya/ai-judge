import { useState, useEffect } from 'react';
import { ArenaPage } from './pages/ArenaPage.jsx';
import { PlaygroundPage } from './pages/PlaygroundPage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { BenchmarkReport } from './components/BenchmarkReport.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { useAuth } from './hooks/useAuth.js';
import { getServiceHealth } from './api.js';
import {
  Swords,
  BarChart3,
  FlaskConical,
  Trophy,
  History,
  Lock,
  LogOut,
  User as UserIcon,
  Zap
} from 'lucide-react';
import './NavBar.css';
import './App.css';

/**
 * Tab definitions with clean Lucide icons, micro-tags, and unique theme keys.
 */
const NAV_TABS = [
  {
    id: 'arena',
    label: 'Arena Battle',
    icon: Swords,
    tag: 'Blind 1v1',
  },
  {
    id: 'benchmark',
    label: 'Benchmark Report',
    icon: BarChart3,
    tag: 'Standardized',
  },
  {
    id: 'playground',
    label: 'Named Playground',
    icon: FlaskConical,
    tag: 'Direct Lab',
  },
  {
    id: 'leaderboard',
    label: 'Elo Leaderboard',
    icon: Trophy,
    tag: 'Rankings',
  },
  {
    id: 'history',
    label: 'Battle History',
    icon: History,
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
  const [navigationContext, setNavigationContext] = useState(null);
  const [configuredProviders, setConfiguredProviders] = useState(['openrouter', 'groq', 'gemini']);

  const handleNavigate = (tab, context = null) => {
    setNavigationContext(context);
    setActiveTab(tab);
  };

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

  useEffect(() => {
    let isMounted = true;
    getServiceHealth()
      .then((health) => {
        if (isMounted && Array.isArray(health?.configuredProviders) && health.configuredProviders.length > 0) {
          setConfiguredProviders(health.configuredProviders.map((p) => p.toLowerCase()));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const isProviderActive = (name) => configuredProviders.includes(name.toLowerCase());

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
              <Swords className="brand-logo-icon" />
            </div>
            <div className="brand-text-group">
              <div className="brand-title-row">
                <span className="brand-title">LM ARENA</span>
                <span className="brand-badge-pill">AI JUDGE</span>
              </div>
              <span className="brand-tagline">
                Autonomous LLM Evaluation &amp; Community Elo Matrix
              </span>
            </div>
          </div>

          {/* Engine / Model Live Badges & User Auth Group */}
          <div className="header-meta-pills">
            {/* Unified Multi-Provider Live Connectivity Cluster */}
            <div className="providers-cluster-pill" title="Live status of connected AI providers">
              <div
                className={`provider-status-item ${!isProviderActive('openrouter') ? 'is-inactive' : ''}`}
                title={isProviderActive('openrouter') ? 'OpenRouter Connected (Multi-model gateway)' : 'OpenRouter API Key Not Configured'}
              >
                <span className={`pulse-dot ${isProviderActive('openrouter') ? 'green' : 'gray'}`}></span>
                <span className="status-label">OpenRouter</span>
              </div>
              <span className="provider-cluster-divider">·</span>
              <div
                className={`provider-status-item ${!isProviderActive('groq') ? 'is-inactive' : ''}`}
                title={isProviderActive('groq') ? 'Groq Connected (Ultra-fast LPU inference)' : 'Groq API Key Not Configured'}
              >
                <span className={`pulse-dot ${isProviderActive('groq') ? 'green' : 'gray'}`}></span>
                <span className="status-label">Groq</span>
              </div>
              <span className="provider-cluster-divider">·</span>
              <div
                className={`provider-status-item ${!isProviderActive('gemini') ? 'is-inactive' : ''}`}
                title={isProviderActive('gemini') ? 'Google Gemini Connected (Benchmark & Arena Judge)' : 'Gemini API Key Not Configured'}
              >
                <span className={`pulse-dot ${isProviderActive('gemini') ? 'green' : 'gray'}`}></span>
                <span className="status-label">Gemini</span>
              </div>
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
                      <span className="user-status-sub">Evaluator</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="header-logout-btn"
                    onClick={logout}
                    title="Sign out of account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="status-indicator-pill">
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="status-label">Guest</span>
                  </div>
                  <button
                    type="button"
                    className="header-auth-btn"
                    onClick={() => openAuthModal('login')}
                  >
                    <Lock className="w-3.5 h-3.5" />
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
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-dock-tab tab-${tab.id} ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setNavigationContext(null);
                  setActiveTab(tab.id);
                }}
              >
                <TabIcon className="tab-icon-svg" />
                <div className="tab-label-group">
                  <span className="tab-title">{tab.label}</span>
                  <span className="tab-micro-tag">{tab.tag}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Page Routing with Smooth View Render ── */}
      <main className="page-view" key={activeTab}>
        {activeTab === 'arena' && (
          <ArenaPage
            initialPrompt={navigationContext?.prompt}
            initialCategory={navigationContext?.category}
          />
        )}
        {activeTab === 'benchmark' && <BenchmarkReport />}
        {activeTab === 'playground' && (
          <PlaygroundPage
            initialModelId={navigationContext?.modelId}
            initialPrompt={navigationContext?.prompt}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardPage onNavigate={handleNavigate} />
        )}
        {activeTab === 'history' && <HistoryPage currentUser={user} />}
      </main>
    </div>
  );
}

export default App;
