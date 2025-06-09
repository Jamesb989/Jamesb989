export default {
  ChatGPT: {
    family: "ChatGPT",
    regex: "ChatGPT",
  },
  Claude: {
    family: "Claude",
    regex: "Claude\\/[0-9\\.]+|Claude",
  },
  Grok: {
    family: "Grok",
    regex: "Grok\\/[0-9\\.]+|Grok",
  },
  Perplexity: {
    family: "Perplexity",
    regex: "Perplexity\\/[0-9\\.]+|Perplexity",
  },
  BingAI: {
    family: "BingAI",
    regex: "BingAI\\/[0-9\\.]+|BingAI",
  },
} satisfies Record<string, { family: string; regex: string }>;


  
  
