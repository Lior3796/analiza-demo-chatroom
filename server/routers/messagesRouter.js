import { Router } from 'express';
import { listMessages } from '../controllers/messagesController.js';

const router = Router();

router.get('/', listMessages);

export default router;
