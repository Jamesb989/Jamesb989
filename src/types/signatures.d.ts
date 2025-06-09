// src/types/signatures.d.ts

// Tell TS how to handle imports of any “*.json” file
declare module '*.json' {
    // Each entry in llm.json has this shape:
    interface LLMSignature {
      family: string;
      regex: string;
    }
  
    // We’re importing a JSON whose top-level is Record<string, LLMSignature>
    const value: Record<string, LLMSignature>;
    export default value;
  }
  