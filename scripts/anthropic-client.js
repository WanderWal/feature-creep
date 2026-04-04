export function createAnthropicJsonRequester({ moduleId, defaultEndpoint }) {
  return async function requestAnthropicJson({
    systemPrompt,
    userPrompt,
    apiKey,
    role,
    roleModelKey,
    maxTokens,
    timeoutMs,
  }) {
    const baseModel = String(game.settings.get(moduleId, "model") || "").trim();
    const resolvedRoleModelKey = String(roleModelKey || getRoleModelKey(role));
    const roleModel = resolvedRoleModelKey
      ? String(game.settings.get(moduleId, resolvedRoleModelKey) || "").trim()
      : "";
    const model = roleModel || baseModel;
    const resolvedMaxTokens = Number(maxTokens) > 0
      ? Number(maxTokens)
      : Number(game.settings.get(moduleId, "maxTokens")) || 3000;
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

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = Number(timeoutMs);
    const effectiveTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 0;
    let timeoutHandle = null;

    if (controller && effectiveTimeout > 0) {
      timeoutHandle = setTimeout(() => {
        controller.abort();
      }, effectiveTimeout);
    }

    let response;
    try {
      response = await fetch(requestEndpoint, {
        method: "POST",
        headers,
        signal: controller?.signal,
        body: JSON.stringify({
          model,
          max_tokens: resolvedMaxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.2,
        }),
      });
    } catch (error) {
      if (controller?.signal?.aborted) {
        const timeoutError = new Error(`AI request timed out after ${effectiveTimeout}ms`);
        timeoutError.code = "AI_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI endpoint error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const rawText = extractTextFromAnthropicResponse(data);
    return parseAiJson(rawText, moduleId);
  };
}

function getRoleModelKey(role) {
  if (role === "planner") return "anthropicPlannerModel";
  if (role === "icon") return "anthropicIconModel";
  if (role === "finalizer") return "anthropicFinalizerModel";
  return "";
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
