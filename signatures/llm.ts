// src/signatures/llm.ts
export default {
  ChatGPT: {
    family: "ChatGPT",
    // Matches “ChatGPT”, “ChatGPT/1.202”, etc.
    regex: /ChatGPT/i,
  },
  Claude: {
    family: "Claude",
    // Matches Claude, ClaudeBot, Claude/2.1, etc.
    regex: /Claude(?:Bot)?/i,
  },
  Grok: {
    family: "Grok",
    // Matches “Grok”, “GrokAI”, “GrokBot”, “Grok/1.0”, etc.
    regex: /Grok(?:AI|Bot)?/i,
  },
  Perplexity: {
    family: "Perplexity",
    // Perplexity’s crawler sometimes identifies as pJsonScraper
    regex: /Perplexity|pJsonScraper/i,
  },
  BingAI: {
    family: "BingAI",
    // Covers BingPreview, BingAI, Bingbot, and MS bots
    regex: /BingPreview|BingAI|Bingbot|MS Search|msnbot/i,
  },
  Gemini: {
    family: "Gemini",
    // Covers Google Gemini and related Google-Extended crawlers
    regex: /Gemini|Google-Extended|Google-LLM/i,
  },
  Anthropic: {
    family: "Anthropic",
    regex: /Anthropic/i,
  },
  GoogleAI: {
    family: "GoogleAI",
    regex: /Google-LLM|GoogleAI|GoogleBot/i,
  },
  GenericAI: {
    family: "GenericAI",
    // Catch “AI” or “Bot” as separate words, avoid false matches
    regex: /\b(?:AI|Bot)\b/i,
  },
} satisfies Record<string, { family: string; regex: RegExp }>;




  
  
