import { Router } from 'express';

export const summarizeRouter = Router();

summarizeRouter.post('/summarize', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'No text provided' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    return;
  }

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Please create a concise but comprehensive summary of the following document. Preserve the main ideas, key points, and structure. Keep headings where appropriate. The summary should be roughly 20-30% of the original length, optimized for speed reading.\n\nDocument:\n${text}`,
      }],
    });

    const summary = (message.content[0] as { type: string; text: string }).text;
    res.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Summarization failed';
    res.status(500).json({ error: msg });
  }
});
