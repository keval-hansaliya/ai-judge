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
  return data.data; // { battleId, prompt, responseA, responseB, turns }
}

/**
 * Sends a follow-up prompt to an ongoing battle
 */
export async function appendTurn(battleId, prompt) {
  const token = await ensureAuth();
  const res = await fetch(`${API_BASE}/battles/${battleId}/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to append turn');
  }
  return data.data; // { battleId, turns }
}

/**
 * Streams initial battle with real-time token chunks for Model A and Model B via SSE
 */
export async function createBattleStream(prompt, onChunkA, onChunkB, onDone, onError) {
  const token = await ensureAuth();

  const response = await fetch(`${API_BASE}/battles/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
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
  const token = await ensureAuth();

  const response = await fetch(`${API_BASE}/battles/${battleId}/turn/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
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
