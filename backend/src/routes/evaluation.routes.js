import { Router } from 'express';
import { judgeEvaluation, runBenchmark, getBenchmark } from '../controllers/evaluation.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/judge', verifyJWT, judgeEvaluation);
router.post('/benchmark', verifyJWT, runBenchmark);
router.get('/benchmark', verifyJWT, getBenchmark);

export default router;
