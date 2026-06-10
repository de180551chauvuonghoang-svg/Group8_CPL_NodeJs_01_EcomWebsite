import express from 'express';
import { searchCombos } from '../controllers/ai.controller.js';

const router = express.Router();

// Route: GET /api/ai/combos
router.get('/combos', searchCombos);

export default router;
