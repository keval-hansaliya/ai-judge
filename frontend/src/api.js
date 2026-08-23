const API_BASE = 'http://localhost:3000/api/v1';

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
 * Ensures user is authenticated by auto-creating/logging into a guest account if needed.
 */
export async function ensureAuth() {
  if (authToken) return authToken;

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
 * Initiates a battle with prompt
 */
export async function createBattle(prompt) {
  const token = await ensureAuth();
  const res = await fetch(`${API_BASE}/battles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create battle');
  }
  return data.data; // { battleId, prompt, responseA, responseB }
}

/**
 * Votes on a battle result ("A", "B", "TIE")
 */
export async function voteBattle(battleId, winner) {
  const token = await ensureAuth();
  const res = await fetch(`${API_BASE}/battles/${battleId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ winner })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to record vote');
  }
  return data.data; // { battleId, winner, modelA: { name, oldElo, newElo }, modelB: { name, oldElo, newElo } }
}

/**
 * Fetches current Elo leaderboard
 */
export async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch leaderboard');
  }
  return data.data; // Array of models sorted by Elo desc
}
