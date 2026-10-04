import { useState } from 'react';
import { createBattleStream, appendTurnStream, voteBattle, triggerAIJudge } from '../api.js';

/**
 * useBattle — encapsulates all Arena battle state and event handlers.
 *
 * Returns everything ArenaPage needs to render the blind battle UI:
 *  - state: currentBattle, voteResult, judgeResult, streaming/voting/evaluating flags, error
 *  - handlers: handleStartBattle, handleSendFollowUp, handleVote, handleRunAIJudge, handleNextBattle
 */
export function useBattle() {
  const [prompt, setPrompt] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [voting, setVoting] = useState(false);
  const [evaluatingJudge, setEvaluatingJudge] = useState(false);
  const [error, setError] = useState(null);

  const [currentBattle, setCurrentBattle] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [judgeResult, setJudgeResult] = useState(null);

  // ─── Start Battle ────────────────────────────────────────────────────────────

  const handleStartBattle = async (e, selectedCategory) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setVoteResult(null);
    setJudgeResult(null);

    const initialTurns = [{ turn: 1, prompt: prompt.trim(), responseA: '', responseB: '' }];
    setCurrentBattle({ battleId: null, prompt: prompt.trim(), category: selectedCategory, turns: initialTurns });

    try {
      await createBattleStream(
        prompt.trim(),
        selectedCategory,
        // onChunkA
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            turns[0] = { ...turns[0], responseA: turns[0].responseA + chunk };
            return { ...prev, turns };
          });
        },
        // onChunkB
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            turns[0] = { ...turns[0], responseB: turns[0].responseB + chunk };
            return { ...prev, turns };
          });
        },
        // onDone
        (data) => {
          setCurrentBattle((prev) => ({ ...prev, battleId: data.battleId, turns: data.turns }));
          setIsStreaming(false);
        },
        // onError
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Streaming battle failed');
      setIsStreaming(false);
    }
  };

  // ─── Follow-Up Turn ──────────────────────────────────────────────────────────

  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpPrompt.trim() || !currentBattle || isStreaming) return;

    const newPrompt = followUpPrompt.trim();
    setFollowUpPrompt('');
    setIsStreaming(true);
    setError(null);

    const currentTurnNum = currentBattle.turns.length + 1;
    setCurrentBattle((prev) => ({
      ...prev,
      turns: [...prev.turns, { turn: currentTurnNum, prompt: newPrompt, responseA: '', responseB: '' }],
    }));

    try {
      await appendTurnStream(
        currentBattle.battleId,
        newPrompt,
        // onChunkA
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            const lastIdx = turns.length - 1;
            turns[lastIdx] = { ...turns[lastIdx], responseA: turns[lastIdx].responseA + chunk };
            return { ...prev, turns };
          });
        },
        // onChunkB
        (chunk) => {
          setCurrentBattle((prev) => {
            if (!prev) return prev;
            const turns = [...prev.turns];
            const lastIdx = turns.length - 1;
            turns[lastIdx] = { ...turns[lastIdx], responseB: turns[lastIdx].responseB + chunk };
            return { ...prev, turns };
          });
        },
        // onDone
        (data) => {
          setCurrentBattle((prev) => ({ ...prev, turns: data.turns }));
          setIsStreaming(false);
        },
        // onError
        (err) => {
          setError(err.message);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Streaming follow-up failed');
      setIsStreaming(false);
    }
  };

  // ─── Human Vote ──────────────────────────────────────────────────────────────

  const handleVote = async (winner) => {
    if (!currentBattle || !currentBattle.battleId || voting || voteResult || isStreaming) return;

    setVoting(true);
    setError(null);

    try {
      const result = await voteBattle(currentBattle.battleId, winner);
      setVoteResult(result);
    } catch (err) {
      setError(err.message || 'Failed to record vote');
    } finally {
      setVoting(false);
    }
  };

  // ─── AI Judge ────────────────────────────────────────────────────────────────

  const handleRunAIJudge = async () => {
    if (!currentBattle || !currentBattle.battleId || evaluatingJudge || isStreaming) return;

    setEvaluatingJudge(true);
    setError(null);

    try {
      const res = await triggerAIJudge(currentBattle.battleId);
      setJudgeResult(res);
    } catch (err) {
      setError(err.message || 'AI Judge evaluation failed');
    } finally {
      setEvaluatingJudge(false);
    }
  };

  // ─── Reset / Next Battle ─────────────────────────────────────────────────────

  const handleNextBattle = () => {
    setCurrentBattle(null);
    setVoteResult(null);
    setJudgeResult(null);
    setPrompt('');
    setFollowUpPrompt('');
    setError(null);
  };

  const dismissError = () => setError(null);

  return {
    // state
    prompt,
    setPrompt,
    followUpPrompt,
    setFollowUpPrompt,
    isStreaming,
    voting,
    evaluatingJudge,
    error,
    currentBattle,
    voteResult,
    judgeResult,
    // handlers
    handleStartBattle,
    handleSendFollowUp,
    handleVote,
    handleRunAIJudge,
    handleNextBattle,
    dismissError,
  };
}
