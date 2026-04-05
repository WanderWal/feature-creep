function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNameKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeItemsArray(value, key) {
  const source = value && typeof value === "object" ? value[key] : [];
  return Array.isArray(source) ? source : [];
}

function buildRoleModelKey(role) {
  if (role === "planner") return "anthropicPlannerModel";
  if (role === "icon") return "anthropicIconModel";
  if (role === "finalizer") return "anthropicFinalizerModel";
  return "";
}

function createBudgetError(message) {
  const error = new Error(message);
  error.code = "ORCH_BUDGET";
  return error;
}

function mergeIconAssignments(items, iconAssignments) {
  const byName = new Map();

  for (const assignment of Array.isArray(iconAssignments) ? iconAssignments : []) {
    if (!assignment || typeof assignment !== "object") continue;
    const key = normalizeNameKey(assignment.name);
    const img = normalizeText(assignment.img);
    if (!key || !img) continue;
    byName.set(key, img);
  }

  return (Array.isArray(items) ? items : []).map((item) => {
    const key = normalizeNameKey(item?.name);
    const img = byName.get(key);
    if (!img) return item;
    return {
      ...item,
      img,
    };
  });
}

export function createAnthropicOrchestrator({ moduleId, requestAnthropicJson, helpers }) {
  const {
    getCraftingGenerationSnapshot,
    getLootGenerationSnapshot,
    searchIconIndex,
  } = helpers;
  let iconToolStageDisabled = false;
  let iconToolDisableNotified = false;

  function getOrchestrationConfig() {
    return {
      enabled: game.settings.get(moduleId, "anthropicOrchestrationEnabled") !== false,
      maxCalls: Math.max(2, Math.min(6, Number(game.settings.get(moduleId, "anthropicOrchestrationMaxCalls")) || 3)),
      totalTokenCap: Math.max(1500, Math.min(64000, Number(game.settings.get(moduleId, "anthropicOrchestrationTotalTokenCap")) || 7000)),
      perCallTokenCap: Math.max(500, Math.min(64000, Number(game.settings.get(moduleId, "anthropicOrchestrationPerCallTokenCap")) || 2500)),
      timeoutSeconds: Math.max(10, Math.min(300, Number(game.settings.get(moduleId, "anthropicOrchestrationTimeoutSeconds")) || 60)),
    };
  }

  async function callStage({ role, systemPrompt, userPrompt, apiKey, budgetState, config, tools, localToolHandler, maxToolRounds }) {
    if (budgetState.calls >= config.maxCalls) {
      throw createBudgetError(`AI orchestration call cap reached (${config.maxCalls})`);
    }

    const baseMaxTokens = Number(game.settings.get(moduleId, "maxTokens")) || 3000;
    const requestedMaxTokens = Math.min(baseMaxTokens, config.perCallTokenCap);

    if (budgetState.estimatedTokens + requestedMaxTokens > config.totalTokenCap) {
      throw createBudgetError(`AI orchestration token cap reached (${config.totalTokenCap})`);
    }

    budgetState.calls += 1;
    budgetState.estimatedTokens += requestedMaxTokens;

    return requestAnthropicJson({
      systemPrompt,
      userPrompt,
      apiKey,
      role,
      roleModelKey: buildRoleModelKey(role),
      maxTokens: requestedMaxTokens,
      timeoutMs: config.timeoutSeconds * 1000,
      tools,
      localToolHandler,
      maxToolRounds,
    });
  }

  function buildLootPlannerPrompts(snapshot, normalizedNotes) {
    const systemPrompt = [
      "You are a D&D5e (2024) loot planner specialist.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON must contain: loot (array), rationale (string).",
      "Each loot item must include: name, type, quantity, description, weight {value, units}, price {value, denomination}.",
      "Do not include img in this stage.",
      "Keep loot grounded to creature CR and identity.",
    ].join("\n");

    const userPrompt = [
      "Produce structured loot candidates for this creature:",
      JSON.stringify(snapshot, null, 2),
      normalizedNotes ? `GM notes:\n${normalizedNotes}` : "",
    ].filter(Boolean).join("\n\n");

    return { systemPrompt, userPrompt };
  }

  function buildCraftPlannerPrompts(snapshot) {
    const systemPrompt = [
      "You are a D&D5e (2024) crafting planner specialist.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON must contain: items (array), rationale (string).",
      "Each item must include: name, type, quantity, craftingDc, description, weight {value, units}, price {value, denomination}.",
      "Do not include img in this stage.",
      "Ensure outputs are materially plausible from provided resources.",
    ].join("\n");

    const userPrompt = [
      "Produce crafted output candidates for this snapshot:",
      JSON.stringify(snapshot, null, 2),
    ].join("\n\n");

    return { systemPrompt, userPrompt };
  }

  function buildIconPrompts(kind, items) {
    const key = kind === "loot" ? "loot" : "items";
    const systemPrompt = [
      "You are an icon assignment specialist for Foundry VTT items.",
      "Return ONLY valid JSON, no markdown.",
      `The JSON must contain: ${key} (array).`,
      "Each array entry must include: name (string), img (string).",
      "Use the search_icon_index tool to find candidate icon paths for each item.",
      "img MUST be selected from paths returned by the search_icon_index tool.",
      "Assign one best-fit icon per item name.",
    ].join("\n");

    const userPrompt = [
      "Assign icons for these generated items:",
      JSON.stringify(items, null, 2),
      "For each item, call search_icon_index with query=<item name> and itemType=<item type> before selecting img.",
    ].join("\n\n");

    return { systemPrompt, userPrompt };
  }

  function buildIconTools() {
    return [{
      name: "search_icon_index",
      description: "Searches persistent icon index memory and returns best icon path candidates.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string" },
          itemType: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    }];
  }

  async function handleIconToolCall({ name, input }) {
    if (name !== "search_icon_index") {
      throw new Error(`Unknown icon tool: ${name}`);
    }

    return searchIconIndex({
      query: String(input?.query || "").trim(),
      itemType: String(input?.itemType || "").trim(),
      limit: Number(input?.limit) || 10,
    });
  }

  function shouldUseIconToolStage() {
    if (game.settings.get(moduleId, "anthropicIconLocalOnly")) return false;
    return !iconToolStageDisabled;
  }

  function shouldDisableIconToolStage(error) {
    const message = String(error?.message || "").toLowerCase();
    if (error instanceof TypeError) return true;
    if (message.includes("fetch") || message.includes("network") || message.includes("cors")) return true;
    if (message.includes("endpoint error 4") || message.includes("tool-use")) return true;
    return false;
  }

  async function assignIconsLocally(items) {
    const source = Array.isArray(items) ? items : [];
    const mapped = [];

    for (const item of source) {
      const query = String(item?.name || "").trim();
      const itemType = String(item?.type || "").trim().toLowerCase();
      if (!query) {
        mapped.push(item);
        continue;
      }

      let result = null;
      try {
        result = await searchIconIndex({ query, itemType, limit: 1 });
      } catch {
        result = null;
      }

      const best = Array.isArray(result?.results) ? result.results[0] : null;
      if (!best?.path) {
        mapped.push(item);
        continue;
      }

      mapped.push({
        ...item,
        img: best.path,
      });
    }

    return mapped;
  }

  function buildFinalizerPrompts(kind, snapshot, itemsWithIcons, rationale) {
    const key = kind === "loot" ? "loot" : "items";
    const systemPrompt = [
      "You are a strict JSON finalizer for Foundry VTT generated items.",
      "Return ONLY valid JSON, no markdown.",
      `The JSON must contain: ${key} (array), rationale (string).`,
      "Preserve img if present and valid.",
      "Normalize malformed fields and keep values practical.",
    ].join("\n");

    const userPrompt = [
      "Finalize these generated items:",
      JSON.stringify(itemsWithIcons, null, 2),
      "Context snapshot:",
      JSON.stringify(snapshot, null, 2),
      rationale ? `Current rationale:\n${rationale}` : "",
    ].filter(Boolean).join("\n\n");

    return { systemPrompt, userPrompt };
  }

  async function runLootPipeline({ actor, notes, apiKey }) {
    const config = getOrchestrationConfig();
    if (!config.enabled) return null;

    const budgetState = { calls: 0, estimatedTokens: 0 };
    const snapshot = getLootGenerationSnapshot(actor);
    const normalizedNotes = normalizeText(notes).slice(0, 1200);

    const plannerPrompts = buildLootPlannerPrompts(snapshot, normalizedNotes);
    const planner = await callStage({
      role: "planner",
      systemPrompt: plannerPrompts.systemPrompt,
      userPrompt: plannerPrompts.userPrompt,
      apiKey,
      budgetState,
      config,
    });

    const plannerLoot = normalizeItemsArray(planner, "loot");
    const plannerRationale = normalizeText(planner?.rationale).slice(0, 1200);

    let iconLoot = plannerLoot;
    if (shouldUseIconToolStage()) {
      try {
        const iconPrompts = buildIconPrompts("loot", plannerLoot);
        const iconResult = await callStage({
          role: "icon",
          systemPrompt: iconPrompts.systemPrompt,
          userPrompt: iconPrompts.userPrompt,
          apiKey,
          budgetState,
          config,
          tools: buildIconTools(),
          localToolHandler: handleIconToolCall,
          maxToolRounds: 8,
        });
        iconLoot = mergeIconAssignments(plannerLoot, normalizeItemsArray(iconResult, "loot"));
      } catch (error) {
        if (shouldDisableIconToolStage(error)) {
          iconToolStageDisabled = true;
          if (!iconToolDisableNotified) {
            iconToolDisableNotified = true;
            ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationIconToolDisabled`));
          }
        } else {
          ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationIconFallback`));
        }

        console.warn(`${moduleId} | icon stage fallback (loot)`, error);
        iconLoot = await assignIconsLocally(plannerLoot);
      }
    } else {
      iconLoot = await assignIconsLocally(plannerLoot);
    }

    try {
      const finalizerPrompts = buildFinalizerPrompts("loot", snapshot, iconLoot, plannerRationale);
      const finalizer = await callStage({
        role: "finalizer",
        systemPrompt: finalizerPrompts.systemPrompt,
        userPrompt: finalizerPrompts.userPrompt,
        apiKey,
        budgetState,
        config,
      });

      return {
        loot: normalizeItemsArray(finalizer, "loot"),
        rationale: normalizeText(finalizer?.rationale || plannerRationale).slice(0, 1200),
        orchestrationMeta: {
          calls: budgetState.calls,
          estimatedTokens: budgetState.estimatedTokens,
        },
      };
    } catch (error) {
      console.warn(`${moduleId} | finalizer stage fallback (loot)`, error);
      ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationFinalizerFallback`));
      return {
        loot: iconLoot,
        rationale: plannerRationale,
        orchestrationMeta: {
          calls: budgetState.calls,
          estimatedTokens: budgetState.estimatedTokens,
          fallback: "finalizer",
        },
      };
    }
  }

  async function runCraftPipeline({ artisanTool, toolProficiencyProfile, ingredientResources, notes, apiKey }) {
    const config = getOrchestrationConfig();
    if (!config.enabled) return null;

    const budgetState = { calls: 0, estimatedTokens: 0 };
    const snapshot = getCraftingGenerationSnapshot(artisanTool, toolProficiencyProfile, ingredientResources, notes);

    const plannerPrompts = buildCraftPlannerPrompts(snapshot);
    const planner = await callStage({
      role: "planner",
      systemPrompt: plannerPrompts.systemPrompt,
      userPrompt: plannerPrompts.userPrompt,
      apiKey,
      budgetState,
      config,
    });

    const plannerItems = normalizeItemsArray(planner, "items");
    const plannerRationale = normalizeText(planner?.rationale).slice(0, 1200);

    let iconItems = plannerItems;
    if (shouldUseIconToolStage()) {
      try {
        const iconPrompts = buildIconPrompts("items", plannerItems);
        const iconResult = await callStage({
          role: "icon",
          systemPrompt: iconPrompts.systemPrompt,
          userPrompt: iconPrompts.userPrompt,
          apiKey,
          budgetState,
          config,
          tools: buildIconTools(),
          localToolHandler: handleIconToolCall,
          maxToolRounds: 8,
        });
        iconItems = mergeIconAssignments(plannerItems, normalizeItemsArray(iconResult, "items"));
      } catch (error) {
        if (shouldDisableIconToolStage(error)) {
          iconToolStageDisabled = true;
          if (!iconToolDisableNotified) {
            iconToolDisableNotified = true;
            ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationIconToolDisabled`));
          }
        } else {
          ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationIconFallback`));
        }

        console.warn(`${moduleId} | icon stage fallback (craft)`, error);
        iconItems = await assignIconsLocally(plannerItems);
      }
    } else {
      iconItems = await assignIconsLocally(plannerItems);
    }

    try {
      const finalizerPrompts = buildFinalizerPrompts("items", snapshot, iconItems, plannerRationale);
      const finalizer = await callStage({
        role: "finalizer",
        systemPrompt: finalizerPrompts.systemPrompt,
        userPrompt: finalizerPrompts.userPrompt,
        apiKey,
        budgetState,
        config,
      });

      return {
        items: normalizeItemsArray(finalizer, "items"),
        rationale: normalizeText(finalizer?.rationale || plannerRationale).slice(0, 1200),
        orchestrationMeta: {
          calls: budgetState.calls,
          estimatedTokens: budgetState.estimatedTokens,
        },
      };
    } catch (error) {
      console.warn(`${moduleId} | finalizer stage fallback (craft)`, error);
      ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationFinalizerFallback`));
      return {
        items: iconItems,
        rationale: plannerRationale,
        orchestrationMeta: {
          calls: budgetState.calls,
          estimatedTokens: budgetState.estimatedTokens,
          fallback: "finalizer",
        },
      };
    }
  }

  async function orchestrateLootGeneration(payload) {
    try {
      return await runLootPipeline(payload);
    } catch (error) {
      if (error?.code === "ORCH_BUDGET") {
        ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationBudgetExceeded`));
      }
      throw error;
    }
  }

  async function orchestrateCraftGeneration(payload) {
    try {
      return await runCraftPipeline(payload);
    } catch (error) {
      if (error?.code === "ORCH_BUDGET") {
        ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationBudgetExceeded`));
      }
      throw error;
    }
  }

  return {
    orchestrateLootGeneration,
    orchestrateCraftGeneration,
  };
}
