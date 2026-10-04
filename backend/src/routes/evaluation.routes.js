import { Router } from 'express';
import { judgeEvaluation, runBenchmark, getBenchmark } from '../controllers/evaluation.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/judge', verifyJWT, judgeEvaluation);
router.post('/benchmark', runBenchmark);
router.get('/benchmark', getBenchmark);

export default router;
