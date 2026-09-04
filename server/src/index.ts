import 'dotenv/config';
import { createApp } from './app.js';
import { readServerConfig } from './config.js';

const cfg = readServerConfig();
const app = createApp(cfg);

app.listen(cfg.port, () => {
  console.log(`RSVP Reader server running on http://localhost:${cfg.port} (mode: ${cfg.mode})`);
});
