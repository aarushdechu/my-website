window.QuadraticAIConfig = {
    // This file is safe to commit. Keep real API keys in:
    // js/quadratic-local-config.js
    apiKey: "PASTE_YOUR_OPENAI_API_KEY_HERE",

    // Use a smaller model for lower cost while staying capable.
    model: "gpt-5.5-mini",

    // The ignored local config can change this to true.
    useOpenAI: false,

    // For a public website, use a backend proxy instead of a browser API key.
    apiProxyUrl: ""
};
