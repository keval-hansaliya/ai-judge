import { Router } from 'express';
import { createBattle, voteBattle } from '../controllers/battle.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyJWT, createBattle);
router.post('/:id/vote', verifyJWT, voteBattle);

export default router;
