import { Router } from 'express';
import { getLeaderboard, recommendModel } from '../controllers/leaderboard.controller.js';

const router = Router();

router.get('/', getLeaderboard);
router.post('/recommend', recommendModel);

export default router;
