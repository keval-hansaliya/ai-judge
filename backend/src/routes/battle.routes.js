import { Router } from 'express';
import {
  createBattle,
  streamBattle,
  appendTurn,
  streamTurn,
  voteBattle,
  getBattles,
  getBattleById,
  deleteBattle,
  getBattleStats,
} from '../controllers/battle.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Battle creation and streaming
router.post('/', verifyJWT, createBattle);
router.post('/stream', verifyJWT, streamBattle);

// Multi-turn continuation
router.post('/:id/turn', verifyJWT, appendTurn);
router.post('/:id/turn/stream', verifyJWT, streamTurn);

// Voting
router.post('/:id/vote', verifyJWT, voteBattle);

// History & Personal Analytics (stats must be before /:id)
router.get('/stats', verifyJWT, getBattleStats);
router.get('/', verifyJWT, getBattles);
router.get('/:id', verifyJWT, getBattleById);
router.delete('/:id', verifyJWT, deleteBattle);

export default router;
