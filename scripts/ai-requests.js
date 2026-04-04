export function createAiRequests({ moduleId, requestAnthropicJson, helpers }) {
  const {
    getJournalGenerationSnapshot,
    summarizeActorForJournalItems,
    getCharacterShopGenerationSnapshot,
    normalizeShopCompendiumSelections,
    buildShopStockFromCompendiumSelections,
    isBeaversCraftingIntegrationAvailable,
    getCraftingGenerationSnapshot,
    getLootGenerationSnapshot,
    formatChallengeRating,
    getMonsterRebalanceSnapshot,
    getMonsterCrGuessSnapshot,
    parseChallengeRating,
    normalizeCrGuessConfidence,
    enhancePayloadForKnownPatterns,
    getIconPromptContext,
  } = helpers;

  async function requestImprovise({ situation, selectedJournals, selectedActors, apiKey }) {
    const systemPrompt = [
      "You are an experienced D&D5e (2024) Dungeon Master assistant helping a GM improvise a scene.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: opening (string), npcReactions (array), outcomes (array), mechanics (array), dmTips (string).",
      "- opening: 2-4 sentence narrative description the DM can read or adapt aloud to set the scene.",
      "- npcReactions: array of 0-4 objects, each with keys: name (string), reaction (string). Describe how key NPCs or groups might react. Leave as empty array if no specific NPCs are relevant.",
      "- outcomes: array of 2-4 brief strings describing plausible ways the situation could resolve.",
      "- mechanics: array of 0-3 brief strings calling out relevant D&D5e mechanics, ability checks, or rules that might apply.",
      "- dmTips: 1-3 sentence private DM note with behind-the-screen advice on running this scene well.",
      "Do not include commentary outside the JSON.",
    ].join("\n");

    const journalSnapshots = selectedJournals
      .map((j) => getJournalGenerationSnapshot(j))
      .filter(Boolean);

    const actorSummaries = selectedActors
      .map((a) => summarizeActorForJournalItems(a))
      .filter(Boolean);

    const userParts = [`Situation to improvise:\n${situation}`];

    if (journalSnapshots.length > 0) {
      userParts.push(`Relevant journal context:\n${JSON.stringify(journalSnapshots, null, 2)}`);
    }

    if (actorSummaries.length > 0) {
      userParts.push(`Involved actors:\n${JSON.stringify(actorSummaries, null, 2)}`);
    }

    const parsed = await requestAnthropicJson({ systemPrompt, userPrompt: userParts.join("\n\n"), apiKey });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const opening = String(parsed.opening ?? "").trim().slice(0, 2000);
    const npcReactions = Array.isArray(parsed.npcReactions) ? parsed.npcReactions : [];
    const outcomes = Array.isArray(parsed.outcomes)
      ? parsed.outcomes.map((s) => String(s || "").trim()).filter(Boolean)
      : [];
    const mechanics = Array.isArray(parsed.mechanics)
      ? parsed.mechanics.map((s) => String(s || "").trim()).filter(Boolean)
      : [];
    const dmTips = String(parsed.dmTips ?? "").trim().slice(0, 1000);

    return { opening, npcReactions, outcomes, mechanics, dmTips };
  }

  async function requestCharacterShopSetup({ actor, apiKey, compendiumPack, compendiumCandidates }) {
    const systemPrompt = [
      "You are a D&D5e (2024) merchant designer for Foundry VTT using Item Piles.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: shopName (string), shopDescription (string), merchant (object), selections (array), rationale (string).",
      "- merchant must include: buyPriceModifier (number), sellPriceModifier (number), openTimesEnabled (boolean).",
      "- IMPORTANT: buyPriceModifier is what players pay when buying from the merchant (usually > 1 for markup, e.g. 1.10 = 110%).",
      "- IMPORTANT: sellPriceModifier is what players receive when selling to the merchant (usually < 1, e.g. 0.50 = 50%).",
      "- buyPriceModifier must be greater than or equal to sellPriceModifier.",
      "- selections must include 8-18 entries chosen ONLY from the provided compendiumCandidates list.",
      "- Each selection entry must have: id (string, exact candidate id), quantity (number >= 1).",
      "- Do not invent ids and do not output items outside compendiumCandidates.",
      "- Do not include items whose name appears in existingInventoryNames.",
      "- shopName and shopDescription should reflect the character identity and specialties.",
      "- rationale should explain briefly why the shop stock fits the character.",
      "Do not include commentary outside JSON.",
    ].join("\n");

    const userPrompt = [
      "Generate an Item Piles merchant setup for this character:",
      JSON.stringify(getCharacterShopGenerationSnapshot(actor, compendiumPack, compendiumCandidates), null, 2),
    ].join("\n\n");

    const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const selections = normalizeShopCompendiumSelections(parsed.selections, compendiumCandidates);
    if (selections.length === 0) {
      ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.invalidResponse`));
      throw new Error("No valid compendium selections in AI shop response");
    }

    const builtStock = await buildShopStockFromCompendiumSelections(compendiumPack, selections);
    if (builtStock.stockItems.length === 0) {
      ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.invalidResponse`));
      throw new Error("Could not resolve selected compendium items");
    }

    return {
      shopName: String(parsed.shopName || actor.name || "Generated Shop").trim().slice(0, 120),
      shopDescription: String(parsed.shopDescription || "").trim().slice(0, 2000),
      merchant: parsed.merchant && typeof parsed.merchant === "object" ? parsed.merchant : {},
      inventory: builtStock.previewItems,
      stockItems: builtStock.stockItems,
      rationale: String(parsed.rationale || "").trim().slice(0, 1200),
    };
  }

  async function requestCraftedItems({ artisanTool, toolProficiencyProfile, ingredientResources, notes, apiKey }) {
    const recipeIntegrationActive = isBeaversCraftingIntegrationAvailable();
    const iconPromptContext = typeof getIconPromptContext === "function"
      ? await getIconPromptContext()
      : { enabled: false, iconOptions: [] };

    const systemPrompt = [
      "You are a D&D5e (2024) crafting assistant for Foundry VTT used by a DM to build a crafting system.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: items (array), rationale (string).",
      "- items: array of 0-4 crafted output items.",
      "- Each output item must have: name (string), type (one of: material|loot|weapon|equipment|consumable|tool|container|treasure), quantity (number >= 1), craftingDc (number), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number >= 0) and denomination (one of: cp|sp|ep|gp|pp)).",
      iconPromptContext.enabled
        ? "- If iconOptions are provided, include img (string) on each item and choose it ONLY from iconOptions.path values."
        : "",
      "- The output items must plausibly be crafted using the selected tool and the provided ingredient resources with quantities.",
      "- If the selected tool and provided resources cannot plausibly produce a meaningful craft result, return items as an empty array.",
      "- Prefer transforming, refining, combining, or improving the provided ingredients rather than inventing unrelated treasure.",
      "- Every output item must clearly consume all selected ingredient resources; do not ignore the selected resources.",
      "- Resource usage must be materially sensible (for example: metal inputs for smithing outputs, wood/leather/textile for fitting outputs, herbs/chemicals for alchemical outputs).",
      "- Do not treat listed ingredients as optional flavor text; assume selected quantities are intended to be spent as crafting inputs.",
      "- If the ingredients are not enough for a complete finished good, return sensible intermediate goods, components, or materials instead.",
      "- Do not include the selected tool itself as an output item.",
      "- Do not merely copy ingredient items unchanged unless a processed or improved version is justified.",
      "- Do not personalize outputs to a specific actor's identity, biography, or class.",
      "- Use toolProficiencyProfile only to tune complexity and craftingDc, not to gate what can exist in the world.",
      "- If an output item is intended to be used as a crafting/check implement (kit, instrument, artisan tool, or utility tool), set its type to tool.",
      "- craftingDc must be a practical tool check DC in the 3-30 range and should scale with complexity and resource quality.",
      "- Lower proficiency should bias toward simpler outputs and/or higher riskier DCs; higher proficiency should allow more refined outputs and/or lower practical DCs.",
      recipeIntegrationActive
        ? "- These outputs will be turned into Beavers Crafting recipes by a DM tool, so each item should be a clear craft result with a meaningful, playable craftingDc and coherent required resources."
        : "",
      "- rationale: brief 1-3 sentence explanation of how the selected tool and ingredients support the crafted output, or why no valid outputs were produced.",
      "Do not include commentary outside the JSON.",
    ].filter(Boolean).join("\n");

    const userPrompt = [
      "Generate crafted output items based on selected tool, tool proficiency profile, selected ingredient resources, and optional notes.",
      "Crafting snapshot:",
      JSON.stringify(getCraftingGenerationSnapshot(artisanTool, toolProficiencyProfile, ingredientResources, notes), null, 2),
      iconPromptContext.enabled
        ? `Available icon paths (choose best-match img per item):\n${JSON.stringify(iconPromptContext, null, 2)}`
        : "",
    ].join("\n\n");

    const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

    return { items, rationale };
  }

  async function requestMonsterLoot({ actor, notes, apiKey }) {
    const normalizedNotes = String(notes ?? "").trim().slice(0, 1200);
    const iconPromptContext = typeof getIconPromptContext === "function"
      ? await getIconPromptContext()
      : { enabled: false, iconOptions: [] };

    const systemPrompt = [
      "You are a D&D5e (2024) Dungeon Master assistant helping create creature loot tables.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: loot (array), rationale (string).",
      "- loot: array of 3-6 items the creature might drop when defeated.",
      "- Each loot item must have: name (string), type (one of: material|weapon|equipment|consumable|tool|treasure), quantity (number >= 1), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number) and denomination (one of: cp|sp|ep|gp|pp)).",
      iconPromptContext.enabled
        ? "- If iconOptions are provided, include img (string) on each loot item and choose it ONLY from iconOptions.path values."
        : "",
      "- Do NOT include any item whose name matches an item in the creature's existingInventory.",
      "- If optional GM notes are provided, use them as high-priority guidance while still keeping loot plausible for the creature.",
      "- rationale: brief 1-2 sentence explanation of why these items fit this creature.",
      "Focus on items appropriate to the creature's nature, habitat, and CR.",
      "Prefer mundane items for low-CR creatures; magic items are only appropriate at higher CRs.",
      "Do not include commentary outside the JSON.",
    ].join("\n");

    const userParts = [
      "Generate loot drop items for this creature. Do NOT suggest any items already in its existingInventory.",
      "Creature snapshot:",
      JSON.stringify(getLootGenerationSnapshot(actor), null, 2),
    ];

    if (normalizedNotes) {
      userParts.push(`GM notes for this roll:\n${normalizedNotes}`);
    }

    if (iconPromptContext.enabled) {
      userParts.push(`Available icon paths (choose best-match img per loot item):\n${JSON.stringify(iconPromptContext, null, 2)}`);
    }

    const userPrompt = userParts.join("\n\n");

    const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const loot = Array.isArray(parsed.loot) ? parsed.loot : [];
    const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

    return { loot, rationale };
  }

  async function requestJournalItems({ snapshot, actorSnapshot, apiKey }) {
    const iconPromptContext = typeof getIconPromptContext === "function"
      ? await getIconPromptContext()
      : { enabled: false, iconOptions: [] };

    const systemPrompt = [
      "You are a D&D5e (2024) Dungeon Master assistant helping generate location-based items from journal notes.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: items (array), rationale (string).",
      "- items: array of 3-8 items inspired by the journal's location and details.",
      "- Each item must have: name (string), type (one of: material|weapon|equipment|consumable|tool|treasure), quantity (number >= 1), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number >= 0) and denomination (one of: cp|sp|ep|gp|pp)).",
      iconPromptContext.enabled
        ? "- If iconOptions are provided, include img (string) on each item and choose it ONLY from iconOptions.path values."
        : "",
      "- Items should be practical, discoverable, gathered or uncovered in/near this location (loot, supplies, clues, relics, tools, etc).",
      "- If actorContext is provided, tailor at least some items to that actor's class, proficiencies, and likely needs while still fitting the location.",
      "- Avoid overpowered legendary items unless the journal clearly supports it.",
      "- rationale: brief 1-3 sentence explanation of why these items fit this journal.",
      "Do not include commentary outside the JSON.",
    ].join("\n");

    const userPrompt = [
      "Generate location-based D&D5e items from this journal snapshot:",
      JSON.stringify(snapshot, null, 2),
      actorSnapshot
        ? `Actor context (the actor searching this location):\n${JSON.stringify(actorSnapshot, null, 2)}`
        : "Actor context: none provided.",
      iconPromptContext.enabled
        ? `Available icon paths (choose best-match img per item):\n${JSON.stringify(iconPromptContext, null, 2)}`
        : "",
    ].join("\n\n");

    const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

    return { items, rationale };
  }

  async function requestAnthropicGeneration({ item, descriptionText, apiKey }) {
    const systemPrompt = [
      "You are a Foundry VTT v13 + D&D5e (2024) data builder.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys:",
      "details (object of update paths/values for the item's system data),",
      "activities (array), effects (array), advancements (array), itemMacro (object), integrationFlags (object).",
      "- details: include only properties relevant for item setup.",
      "- activities: each array item should be a plain object representing one activity.",
      "- effects: array of ActiveEffect-like objects with at least name/changes where applicable.",
      "- advancements: array of dnd5e advancement objects.",
      "- itemMacro: object with name and command for Item Macro module.",
      "- integrationFlags: object containing optional item flag paths/values for dae, dime, and midi-qol.",
      "- If itemMacro.command is present, also provide midi-qol linkage so ItemMacro executes.",
      "- Never include item description fields in details.",
      "- If text describes replacing a spell's damage type (e.g. 'change its damage type to Psychic'), provide a working itemMacro.command that handles that replacement at use time and include midi-qol linkage flags.",
      "Do not include commentary.",
    ].join("\n");

    const userPrompt = [
      `Item name: ${item.name}`,
      `Item type: ${item.type}`,
      "Item description:",
      descriptionText,
    ].join("\n\n");

    const parsed = await requestAnthropicJson({
      systemPrompt,
      userPrompt,
      apiKey,
    });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    return enhancePayloadForKnownPatterns({
      payload: parsed,
      item,
      descriptionText,
    });
  }

  async function requestMonsterRebalance({ actor, targetCr, apiKey }) {
    const systemPrompt = [
      "You are a Foundry VTT v13 + D&D5e (2024) monster rebalancer.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: actorUpdates (object), itemUpdates (array).",
      "- actorUpdates: flat object of Foundry update paths/values for the NPC actor.",
      "- itemUpdates: array of objects with id, name, type, and updates.",
      "- Preserve the monster's identity, role, and signature abilities while adjusting numbers for the requested CR.",
      "- Prefer updating existing attacks, actions, spells, and save DCs instead of inventing new actions.",
      "- For action mechanics, use exact D&D5e activity paths whenever possible, especially system.activities.<activityId>.attack.bonus, system.activities.<activityId>.attack.flat, system.activities.<activityId>.damage.parts, system.activities.<activityId>.save.dc.formula, system.activities.<activityId>.save.dc.calculation, and system.activities.<activityId>.description.",
      "- Do not only rewrite descriptive text. When an action's text changes for damage, attack bonus, save DC, recharge, or range, update the matching system.activities paths too.",
      "- You may update action descriptions when needed to keep text aligned with changed damage, DCs, save text, recharge, or scaling.",
      "- Do not remove items.",
      "- Use existing item ids when provided.",
      "- Provide only update paths and values that should change.",
      "- Set challenge rating data in actorUpdates.",
      "Do not include commentary.",
    ].join("\n");

    const userPrompt = [
      `Target challenge rating: ${formatChallengeRating(targetCr)} (${targetCr})`,
      "Current monster snapshot:",
      JSON.stringify(getMonsterRebalanceSnapshot(actor), null, 2),
    ].join("\n\n");

    const parsed = await requestAnthropicJson({
      systemPrompt,
      userPrompt,
      apiKey,
    });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    return parsed;
  }

  async function requestMonsterCrGuess({ actor, apiKey }) {
    const systemPrompt = [
      "You are a D&D5e (2024) challenge-rating estimator.",
      "You will receive an anonymized monster snapshot.",
      "Do not identify the monster.",
      "Return ONLY valid JSON, no markdown.",
      "The JSON object must contain these keys: estimatedCr (number), confidence (string), rationale (string).",
      "- estimatedCr: numeric CR estimate such as 0.125, 0.25, 0.5, 1, 2, 3, ...",
      "- confidence: one of low, medium, high.",
      "- rationale: concise 1-3 sentence explanation based on combat stats and actions.",
      "Do not include commentary outside JSON.",
    ].join("\n");

    const userPrompt = [
      "Estimate the most likely CR for this anonymized monster snapshot:",
      JSON.stringify(getMonsterCrGuessSnapshot(actor), null, 2),
    ].join("\n\n");

    const parsed = await requestAnthropicJson({
      systemPrompt,
      userPrompt,
      apiKey,
    });

    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response did not parse into an object");
    }

    const estimatedCr = parseChallengeRating(parsed.estimatedCr);
    if (estimatedCr === null) {
      ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.invalidResponse`));
      throw new Error("Invalid CR estimate in AI response");
    }

    const confidence = normalizeCrGuessConfidence(parsed.confidence);
    const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

    return {
      estimatedCr,
      confidence,
      rationale,
    };
  }

  return {
    requestImprovise,
    requestCharacterShopSetup,
    requestCraftedItems,
    requestMonsterLoot,
    requestJournalItems,
    requestAnthropicGeneration,
    requestMonsterRebalance,
    requestMonsterCrGuess,
  };
}
