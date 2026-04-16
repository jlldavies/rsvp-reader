import { createApp } from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3847;
const app = createApp();

app.listen(PORT, () => {
  console.log(`RSVP Reader server running on http://localhost:${PORT}`);
});
