// src/signatures/llm.ts
export default {
  ChatGPT: {
    family: "ChatGPT",
    // Matches “ChatGPT”, “ChatGPT/1.202”, etc.
    regex: /ChatGPT/i,
  },
  Claude: {
    family: "Claude",
    // Claude, ClaudeBot, Claude/2.1 …
    regex: /Claude(?:Bot)?/i,
  },
  Grok: {
    family: "Grok",
    regex: /Grok/i,
  },
  Perplexity: {
    family: "Perplexity",
    // Perplexity’s crawler sometimes identifies as pJsonScraper
    regex: /Perplexity|pJsonScraper/i,
  },
  BingAI: {
    family: "BingAI",
    // Covers BingPreview and possible “BingAI”
    regex: /BingPreview|BingAI|Bingbot/i,
  },
  GenericAI: {
    family: "GenericAI",
    // Catch “AI” or “Bot” as separate words, avoid false matches
    regex: /\b(?:AI|Bot)\b/i,
  },
} satisfies Record<string, { family: string; regex: RegExp }>;



  
  
