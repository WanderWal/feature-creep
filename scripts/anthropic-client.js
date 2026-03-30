export function createAnthropicJsonRequester({ moduleId, defaultEndpoint }) {
  return async function requestAnthropicJson({ systemPrompt, userPrompt, apiKey }) {
    const model = game.settings.get(moduleId, "model");
    const maxTokens = Number(game.settings.get(moduleId, "maxTokens")) || 3000;
    const configuredEndpoint = String(game.settings.get(moduleId, "requestEndpoint") || "").trim();
    const requestEndpoint = configuredEndpoint || defaultEndpoint;
    const relayAuthHeader = String(game.settings.get(moduleId, "relayAuthHeader") || "").trim();

    const headers = {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    if (relayAuthHeader) {
      headers.Authorization = relayAuthHeader;
    }

    const response = await fetch(requestEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI endpoint error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const rawText = extractTextFromAnthropicResponse(data);
    return parseAiJson(rawText, moduleId);
  };
}

function extractTextFromAnthropicResponse(data) {
  const text = data?.content
    ?.filter((part) => part?.type === "text")
    ?.map((part) => part.text)
    ?.join("\n")
    ?.trim();

  if (!text) {
    throw new Error("No text content in Anthropic response");
  }

  return text;
}

function parseAiJson(text, moduleId) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
  }

  ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.invalidResponse`));
  throw new Error("Invalid AI JSON response");
}
