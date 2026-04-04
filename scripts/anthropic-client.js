export function createAnthropicJsonRequester({ moduleId, defaultEndpoint }) {
  return async function requestAnthropicJson({
    systemPrompt,
    userPrompt,
    apiKey,
    role,
    roleModelKey,
    maxTokens,
    timeoutMs,
    tools,
    localToolHandler,
    maxToolRounds,
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

    const supportsTools = Array.isArray(tools) && tools.length > 0 && typeof localToolHandler === "function";
    const roundsLimit = Math.max(1, Math.min(10, Number(maxToolRounds) || 4));
    const messages = [{ role: "user", content: userPrompt }];
    let rounds = 0;
    try {
      while (true) {
        rounds += 1;
        const body = {
          model,
          max_tokens: resolvedMaxTokens,
          system: systemPrompt,
          messages,
          temperature: 0.2,
        };

        if (supportsTools) {
          body.tools = tools;
        }

        let response;
        try {
          response = await fetch(requestEndpoint, {
            method: "POST",
            headers,
            signal: controller?.signal,
            body: JSON.stringify(body),
          });
        } catch (error) {
          if (controller?.signal?.aborted) {
            const timeoutError = new Error(`AI request timed out after ${effectiveTimeout}ms`);
            timeoutError.code = "AI_TIMEOUT";
            throw timeoutError;
          }
          throw error;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`AI endpoint error ${response.status}: ${text}`);
        }

        const data = await response.json();
        const toolUses = extractToolUsesFromAnthropicResponse(data);

        if (supportsTools && toolUses.length > 0) {
          if (rounds >= roundsLimit) {
            throw new Error(`AI tool-use exceeded max rounds (${roundsLimit})`);
          }

          const toolResults = await Promise.all(toolUses.map(async (toolUse) => {
            try {
              const result = await localToolHandler({
                name: String(toolUse.name || "").trim(),
                input: toolUse.input ?? {},
              });

              return {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: typeof result === "string" ? result : JSON.stringify(result ?? {}),
              };
            } catch (error) {
              return {
                type: "tool_result",
                tool_use_id: toolUse.id,
                is_error: true,
                content: String(error?.message || "Tool execution failed"),
              };
            }
          }));

          messages.push({ role: "assistant", content: data.content ?? [] });
          messages.push({ role: "user", content: toolResults });
          continue;
        }

        const rawText = extractTextFromAnthropicResponse(data);
        return parseAiJson(rawText, moduleId);
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
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

function extractToolUsesFromAnthropicResponse(data) {
  const content = Array.isArray(data?.content) ? data.content : [];
  return content
    .filter((part) => part?.type === "tool_use")
    .map((part) => ({
      id: part.id,
      name: part.name,
      input: part.input,
    }))
    .filter((part) => part.id && part.name);
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
