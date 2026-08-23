import { Router } from 'express';
import { createBattle, streamBattle, appendTurn, streamTurn, voteBattle } from '../controllers/battle.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyJWT, createBattle);
router.post('/stream', verifyJWT, streamBattle);
router.post('/:id/turn', verifyJWT, appendTurn);
router.post('/:id/turn/stream', verifyJWT, streamTurn);
router.post('/:id/vote', verifyJWT, voteBattle);

export default router;
