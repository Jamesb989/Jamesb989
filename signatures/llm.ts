// src/signatures/llm.ts

export default {
  ChatGPT: {
    family: "ChatGPT",
    regex: "ChatGPT",
  },
  Claude: {
    family: "Claude",
    regex: "Claude",
  },
  Grok: {
    family: "Grok",
    regex: "Grok",
  },
  Perplexity: {
    family: "Perplexity",
    regex: "Perplexity",
  },
  BingAI: {
    family: "BingAI",
    regex: "BingAI",
  },
  // Fallback: catch any other AI‐style bot User-Agent
  GenericAI: {
    family: "GenericAI",
    regex: "(AI|Bot)",
  },
} satisfies Record<string, { family: string; regex: string }>;



  
  
