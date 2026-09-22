import { createServer } from './server.js';

const port = process.env.PORT || 3001;

createServer().server.listen(port, () => console.log(`chatroom listening on ${port}`));
