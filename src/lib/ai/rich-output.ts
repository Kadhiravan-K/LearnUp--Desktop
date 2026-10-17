import { z } from 'zod';

export const textBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string()
});

export const tableBlockSchema = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});

export const quizBlockSchema = z.object({
  type: z.literal('quiz'),
  question: z.string(),
  options: z.array(z.string()).min(2),
  answerIndex: z.number().int().min(0),
  explanation: z.string()
});

export const flashcardBlockSchema = z.object({
  type: z.literal('flashcard'),
  front: z.string(),
  back: z.string(),
  hint: z.string().optional()
});

export const timelineBlockSchema = z.object({
  type: z.literal('timeline'),
  title: z.string(),
  events: z.array(
    z.object({
      time: z.string(),
      title: z.string(),
      description: z.string()
    })
  )
});

export const diagramBlockSchema = z.object({
  type: z.literal('diagram'),
  diagramType: z.enum(['flowchart', 'mindmap', 'sequence', 'timeline', 'state']),
  code: z.string().max(5000, 'Diagram code exceeds maximum allowed size'),
  accessibleText: z.string()
});

export const toolCallBlockSchema = z.object({
  type: z.literal('tool_call'),
  toolName: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  summary: z.string()
});

export const richBlockSchema = z.discriminatedUnion('type', [
  textBlockSchema,
  tableBlockSchema,
  quizBlockSchema,
  flashcardBlockSchema,
  timelineBlockSchema,
  diagramBlockSchema,
  toolCallBlockSchema
]);

export const richAiResponseSchema = z.object({
  blocks: z.array(richBlockSchema)
});

export type TextBlock = z.infer<typeof textBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type QuizBlock = z.infer<typeof quizBlockSchema>;
export type FlashcardBlock = z.infer<typeof flashcardBlockSchema>;
export type TimelineBlock = z.infer<typeof timelineBlockSchema>;
export type DiagramBlock = z.infer<typeof diagramBlockSchema>;
export type ToolCallBlock = z.infer<typeof toolCallBlockSchema>;
export type RichBlock = z.infer<typeof richBlockSchema>;
export type RichAiResponse = z.infer<typeof richAiResponseSchema>;

/**
 * Validates untrusted model output into a typed RichBlock array.
 * If invalid, gracefully parses text blocks as safe fallback.
 */
export function parseRichAiOutput(rawJsonOrText: unknown): RichBlock[] {
  if (typeof rawJsonOrText === 'string') {
    // Attempt parsing JSON
    try {
      const parsed = JSON.parse(rawJsonOrText);
      const validated = richAiResponseSchema.safeParse(parsed);
      if (validated.success) {
        return sanitizeRichBlocks(validated.data.blocks);
      }
    } catch {
      // Plain text fallback
      return [{ type: 'text', content: rawJsonOrText }];
    }
  }

  if (typeof rawJsonOrText === 'object' && rawJsonOrText !== null) {
    const validated = richAiResponseSchema.safeParse(rawJsonOrText);
    if (validated.success) {
      return sanitizeRichBlocks(validated.data.blocks);
    }
  }

  // Safe fallback to plain string
  return [{ type: 'text', content: String(rawJsonOrText || '') }];
}

/**
 * Sanitizes all text fields within blocks to prevent XSS and strip executable protocols.
 */
export function sanitizeRichBlocks(blocks: RichBlock[]): RichBlock[] {
  const sanitize = (str: string) =>
    str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();

  return blocks.map((block) => {
    switch (block.type) {
      case 'text':
        return { type: 'text', content: sanitize(block.content) };
      case 'table':
        return {
          type: 'table',
          headers: block.headers.map(sanitize),
          rows: block.rows.map((row) => row.map(sanitize))
        };
      case 'quiz':
        return {
          type: 'quiz',
          question: sanitize(block.question),
          options: block.options.map(sanitize),
          answerIndex: block.answerIndex,
          explanation: sanitize(block.explanation)
        };
      case 'flashcard':
        return {
          type: 'flashcard',
          front: sanitize(block.front),
          back: sanitize(block.back),
          hint: block.hint ? sanitize(block.hint) : undefined
        };
      case 'timeline':
        return {
          type: 'timeline',
          title: sanitize(block.title),
          events: block.events.map((e) => ({
            time: sanitize(e.time),
            title: sanitize(e.title),
            description: sanitize(e.description)
          }))
        };
      case 'diagram':
        return {
          type: 'diagram',
          diagramType: block.diagramType,
          code: block.code.replace(/<script/gi, '').trim(),
          accessibleText: sanitize(block.accessibleText)
        };
      case 'tool_call':
        return {
          type: 'tool_call',
          toolName: sanitize(block.toolName),
          status: block.status,
          summary: sanitize(block.summary)
        };
    }
  });
}
