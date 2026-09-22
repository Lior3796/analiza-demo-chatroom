import { getRecentMessages } from '../models/messageModel.js';

export function listMessages(req, res) {
  res.json(getRecentMessages());
}
