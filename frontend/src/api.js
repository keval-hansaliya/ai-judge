// Dynamically resolve API Base from env, defaulting to relative /api/v1 (in production/proxy) or localhost:3000
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:3000/api/v1'
);

let authToken = localStorage.getItem('ai_judge_token') || null;

export const getAuthToken = () => authToken;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('ai_judge_token', token);
  } else {
    localStorage.removeItem('ai_judge_token');
  }
};

/**
 * Ensures user is authenticated by auto-creating/logging into a guest account.
 * Automatically clears stale or expired tokens.
 */
export async function ensureAuth(forceRefresh = false) {
  if (authToken && !forceRefresh) return authToken;

  // Clear stale token if refreshing
  setAuthToken(null);

  const guestEmail = `guest_${Math.random().toString(36).substring(2, 9)}@arena.local`;
  const guestPassword = 'Password123!';
  const guestName = 'Arena Guest';

  try {
    // 1. Register
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: guestName, email: guestEmail, password: guestPassword })
    });

    if (!regRes.ok) {
      const errData = await regRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Registration failed');
    }

    // 2. Login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: guestEmail, password: guestPassword })
    });

    const loginData = await loginRes.json();
    if (loginData?.data?.token) {
      setAuthToken(loginData.data.token);
      return loginData.data.token;
    } else {
      throw new Error(loginData.message || 'Login failed');
    }
  } catch (err) {
    console.error('Auth initialization failed:', err);
    throw err;
  }
}

/**
 * Log in with user credentials
 */
export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Invalid email or password');
  }

  if (data?.data?.token) {
    setAuthToken(data.data.token);
  }
  return data.data;
}

/**
 * Register a new user account
 */
export async function registerUser({ name, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  if (data?.data?.token) {
    setAuthToken(data.data.token);
  }
  return data.data;
}

/**
 * Log out user from current session
 */
export async function logoutUser() {
  try {
    if (authToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  } catch (err) {
    console.warn('Logout request failed:', err);
  } finally {
    setAuthToken(null);
  }
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUser() {
  if (!authToken) {
    await ensureAuth();
  }

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch user profile');
  }

  return data.data;
}

/**
 * Universal authenticated fetch with automatic 401 retry and token regeneration.
 */
export async function authFetch(url, options = {}) {
  let token = await ensureAuth();

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  let res = await fetch(url, { ...options, headers });

  // If token is expired or invalid (401), refresh token once and retry automatically
  if (res.status === 401) {
    token = await ensureAuth(true); // force fresh token
    const retryHeaders = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    res = await fetch(url, { ...options, headers: retryHeaders });
  }

  return res;
}

/**
 * Initiates a battle with prompt
 */
export async function createBattle(prompt) {
  const res = await authFetch(`${API_BASE}/battles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create battle');
  }
  return data.data;
}

/**
 * Sends a follow-up prompt to an ongoing battle
 */
export async function appendTurn(battleId, prompt) {
  const res = await authFetch(`${API_BASE}/battles/${battleId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to append turn');
  }
  return data.data;
}

/**
 * Streams initial battle with real-time token chunks for Model A and Model B via SSE
 * Supports optional modelAId, modelBId, and options for Named Playground mode
 */
export async function createBattleStream(prompt, category = 'General', onChunkA, onChunkB, onDone, onError, customConfig = {}) {
  const payload = {
    prompt,
    category,
    ...(customConfig.modelAId ? { modelAId: customConfig.modelAId } : {}),
    ...(customConfig.modelBId ? { modelBId: customConfig.modelBId } : {}),
    ...(customConfig.options ? { options: customConfig.options } : {})
  };

  let response = await authFetch(`${API_BASE}/battles/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Streaming failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();

    for (const evtBlock of events) {
      if (!evtBlock.trim()) continue;
      const lines = evtBlock.split('\n');
      let eventType = 'message';
      let data = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) {
          try { data = JSON.parse(line.slice(6)); } catch(e) {}
        }
      }

      if (eventType === 'chunk_a' && data?.text && onChunkA) onChunkA(data.text);
      if (eventType === 'chunk_b' && data?.text && onChunkB) onChunkB(data.text);
      if (eventType === 'done' && data && onDone) onDone(data);
      if (eventType === 'error' && data && onError) onError(new Error(data.message));
    }
  }
}

/**
 * Streams follow-up turn with real-time token chunks for Model A and Model B via SSE
 */
export async function appendTurnStream(battleId, prompt, onChunkA, onChunkB, onDone, onError) {
  const response = await authFetch(`${API_BASE}/battles/${battleId}/turn/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Streaming turn failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();

    for (const evtBlock of events) {
      if (!evtBlock.trim()) continue;
      const lines = evtBlock.split('\n');
      let eventType = 'message';
      let data = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) {
          try { data = JSON.parse(line.slice(6)); } catch(e) {}
        }
      }

      if (eventType === 'chunk_a' && data?.text && onChunkA) onChunkA(data.text);
      if (eventType === 'chunk_b' && data?.text && onChunkB) onChunkB(data.text);
      if (eventType === 'done' && data && onDone) onDone(data);
      if (eventType === 'error' && data && onError) onError(new Error(data.message));
    }
  }
}

/**
 * Votes on a battle result ("A", "B", "TIE")
 */
export async function voteBattle(battleId, winner) {
  const res = await authFetch(`${API_BASE}/battles/${battleId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winner })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to record vote');
  }
  return data.data;
}

/**
 * Triggers automated AI Judge evaluation for a battle
 */
export async function triggerAIJudge(battleId) {
  const res = await authFetch(`${API_BASE}/evaluations/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ battleId })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'AI Judge evaluation failed');
  }
  return data.data;
}

/**
 * Fetches current Elo leaderboard with optional category filter
 */
export async function getLeaderboard(category = 'All') {
  const url = category && category !== 'All'
    ? `${API_BASE}/leaderboard?category=${encodeURIComponent(category)}`
    : `${API_BASE}/leaderboard`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch leaderboard');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Runs the standardized benchmark suite across all models
 */
export async function runBenchmarkSuite() {
  const res = await authFetch(`${API_BASE}/evaluations/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(90000)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to run benchmark suite');
  }
  return data.data;
}

/**
 * Retrieves the latest benchmark report
 */
export async function getBenchmarkReport() {
  const res = await authFetch(`${API_BASE}/evaluations/benchmark`, {
    method: 'GET',
    signal: AbortSignal.timeout(15000)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch benchmark report');
  }
  return data.data;
}

/**
 * Retrieves paginated battle history for the authenticated user
 */
export async function getBattles({ page = 1, limit = 10, category = 'All', winner, search } = {}) {
  const query = new URLSearchParams();
  if (page) query.set('page', page);
  if (limit) query.set('limit', limit);
  if (category && category !== 'All') query.set('category', category);
  if (winner) query.set('winner', winner);
  if (search && search.trim()) query.set('search', search.trim());

  const res = await authFetch(`${API_BASE}/battles?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch battle history');
  }
  return data.data;
}

/**
 * Retrieves full details and conversation turns for a specific battle
 */
export async function getBattleById(battleId) {
  const res = await authFetch(`${API_BASE}/battles/${battleId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch battle details');
  }
  return data.data;
}

/**
 * Deletes a battle from user history
 */
export async function deleteBattle(battleId) {
  const res = await authFetch(`${API_BASE}/battles/${battleId}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete battle');
  }
  return data.data;
}

/**
 * Retrieves aggregate personal statistics for the authenticated user
 */
export async function getBattleStats() {
  const res = await authFetch(`${API_BASE}/battles/stats`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch personal battle statistics');
  }
  return data.data;
}


