export function buildSummaryPrompt(input: { title?: string; content: string }): string {
  return [
    'Summarize the following article in 2 to 3 sentences, in the same language as the content.',
    'Return only the summary, with no preamble.',
    '',
    `Title: ${input.title ?? 'Untitled'}`,
    '',
    input.content,
  ].join('\n')
}
