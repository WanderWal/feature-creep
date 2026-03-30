export function createAiHelpers({ helpers }) {
  const {
    htmlToText,
    resolveJournalEntry,
    normalizeGeneratedItemType,
    getDefaultWeightUnit,
  } = helpers;

  function summarizeActorForJournalItems(actor) {
    const system = actor.system ?? {};
    const classes = actor.items
      .filter((item) => item?.type === "class")
      .map((item) => ({
        name: item.name,
        level: item.system?.levels ?? null,
        subclass: item.system?.subclass?.name ?? null,
      }));

    return {
      name: actor.name,
      type: actor.type,
      level: system.details?.level ?? null,
      race: system.details?.race ?? null,
      classes,
      abilities: summarizeAbilitiesForCrGuess(system.abilities ?? {}),
      proficiencies: {
        skills: foundry.utils.deepClone(system.skills ?? {}),
        tools: foundry.utils.deepClone(system.tools ?? {}),
        weapons: foundry.utils.deepClone(system.traits?.weaponProf ?? {}),
        armor: foundry.utils.deepClone(system.traits?.armorProf ?? {}),
        languages: foundry.utils.deepClone(system.traits?.languages ?? {}),
      },
      inventory: actor.items
        .filter((item) => ["weapon", "equipment", "consumable", "tool", "loot", "container"].includes(item.type))
        .map((item) => ({
          name: item.name,
          type: item.type,
          quantity: item.system?.quantity ?? null,
        }))
        .slice(0, 80),
    };
  }

  function getCharacterShopGenerationSnapshot(actor, compendiumPack, compendiumCandidates) {
    const system = actor.system ?? {};

    const classes = actor.items
      .filter((item) => item?.type === "class")
      .map((item) => ({
        name: item.name,
        level: item.system?.levels ?? null,
        subclass: item.system?.subclass?.name ?? null,
      }));

    const tools = actor.items
      .filter((item) => item?.type === "tool")
      .map((item) => item.name)
      .slice(0, 30);

    const existingInventory = actor.items
      .filter((item) => ["loot", "weapon", "equipment", "consumable", "tool", "container"].includes(item.type))
      .map((item) => ({
        name: item.name,
        type: item.type,
        quantity: item.system?.quantity ?? null,
        price: foundry.utils.deepClone(item.system?.price ?? {}),
      }));

    return {
      compendium: {
        id: compendiumPack?.collection ?? compendiumPack?.metadata?.id ?? null,
        label: compendiumPack?.title ?? compendiumPack?.metadata?.label ?? null,
        candidateCount: compendiumCandidates.length,
        candidates: compendiumCandidates,
      },
      actor: {
        name: actor.name,
        level: system.details?.level ?? null,
        race: system.details?.race ?? null,
        background: system.details?.background ?? null,
        biography: htmlToText(system.details?.biography?.value ?? "").trim().slice(0, 2000),
        classes,
        abilities: summarizeAbilitiesForCrGuess(system.abilities ?? {}),
        proficiencies: {
          skills: foundry.utils.deepClone(system.skills ?? {}),
          tools: foundry.utils.deepClone(system.tools ?? {}),
          languages: foundry.utils.deepClone(system.traits?.languages ?? {}),
        },
        knownTools: tools,
        existingInventory,
        existingInventoryNames: existingInventory.map((item) => item.name),
      },
    };
  }

  function normalizeShopCompendiumSelections(selections, candidates) {
    const candidateIds = new Set((Array.isArray(candidates) ? candidates : []).map((candidate) => candidate.id));
    const mergedById = new Map();

    for (const selection of Array.isArray(selections) ? selections : []) {
      if (!selection || typeof selection !== "object") continue;

      const id = String(selection.id || selection._id || selection.itemId || "").trim();
      if (!id || !candidateIds.has(id)) continue;

      const quantity = Math.max(1, Math.min(99, Math.round(Number(selection.quantity) || 1)));
      mergedById.set(id, Math.min(99, (mergedById.get(id) ?? 0) + quantity));
    }

    return Array.from(mergedById.entries()).map(([id, quantity]) => ({ id, quantity }));
  }

  async function buildShopStockFromCompendiumSelections(compendiumPack, selections) {
    const stockItems = [];
    const previewItems = [];

    for (const selection of selections) {
      let doc = null;
      try {
        doc = await compendiumPack.getDocument(selection.id);
      } catch {
        doc = null;
      }
      if (!doc) continue;

      const quantity = Math.max(1, Math.min(99, Math.round(Number(selection.quantity) || 1)));
      const itemData = doc.toObject();
      foundry.utils.setProperty(itemData, "system.quantity", quantity);

      stockItems.push({ item: itemData, quantity });

      previewItems.push({
        name: String(doc.name || "").trim().slice(0, 100),
        type: normalizeGeneratedItemType(doc.type),
        quantity,
        description: htmlToText(doc.system?.description?.value ?? "").trim().slice(0, 2000),
        weightValue: Math.max(0, Number(doc.system?.weight?.value) || 0),
        weightUnits: ["lb", "kg"].includes(String(doc.system?.weight?.units || "").toLowerCase())
          ? String(doc.system?.weight?.units || "").toLowerCase()
          : getDefaultWeightUnit(),
        priceValue: Math.max(0, Number(doc.system?.price?.value) || 0),
        priceDenom: ["cp", "sp", "ep", "gp", "pp"].includes(String(doc.system?.price?.denomination || "").toLowerCase())
          ? String(doc.system?.price?.denomination || "").toLowerCase()
          : "gp",
      });
    }

    return {
      stockItems,
      previewItems,
    };
  }

  function getCraftingGenerationSnapshot(artisanTool, toolProficiencyProfile, ingredientResources, notes) {
    return {
      tool: summarizeCraftingItem(artisanTool),
      toolProficiencyProfile,
      ingredientResources: ingredientResources.map((resource) => ({
        selectedQuantity: resource.quantity,
        availableQuantity: resource.available,
        item: summarizeCraftingItem(resource.item),
      })),
      notes: String(notes || "").trim() || null,
    };
  }

  function getJournalGenerationSnapshot(sourceDocument) {
    const journal = resolveJournalEntry(sourceDocument);
    if (!journal) return null;

    const pages = [];

    if (sourceDocument?.documentName === "JournalEntryPage") {
      const pageSnapshot = summarizeJournalPage(sourceDocument);
      if (pageSnapshot) pages.push(pageSnapshot);
    } else {
      for (const page of journal.pages ?? []) {
        const pageSnapshot = summarizeJournalPage(page);
        if (pageSnapshot) pages.push(pageSnapshot);
      }
    }

    if (pages.length === 0) return null;

    const combinedText = pages.map((page) => page.text).join("\n\n").trim();
    if (!combinedText) return null;

    return {
      name: journal.name,
      folder: journal.folder?.name ?? null,
      pageCount: pages.length,
      pages,
      combinedText: combinedText.slice(0, 8000),
    };
  }

  function getLootGenerationSnapshot(actor) {
    const system = actor.system ?? {};

    return {
      name: actor.name,
      cr: formatChallengeRating(system.details?.cr) || "0",
      size: system.traits?.size ?? null,
      creatureType: system.details?.type?.value ?? null,
      creatureSubtype: system.details?.type?.subtype ?? null,
      biography: htmlToText(system.details?.biography?.value ?? "").trim().slice(0, 2000),
      existingInventory: actor.items.map((item) => ({
        name: item.name,
        type: item.type,
      })),
    };
  }

  function isBeaversCraftingIntegrationAvailable() {
    const testClasses = globalThis.beaversSystemInterface?.testClasses;

    return Boolean(
      game.modules?.get("beavers-crafting")?.active
      && game.modules?.get("beavers-system-interface")?.active
      && game.modules?.get("bsa-dnd5e")?.active
      && globalThis.beaversSystemInterface
      && testClasses?.ToolTest
    );
  }

  function enhancePayloadForKnownPatterns({ payload, item, descriptionText }) {
    const patched = foundry.utils.deepClone(payload ?? {});
    const text = String(descriptionText || "");

    const hasDamageSpellTrigger = /when\s+you\s+cast\s+a\s+spell\s+that\s+deals\s+damage/i.test(text);
    const hasPsychicSwap = /change\s+(?:its|the)\s+damage\s+type\s+to\s+psychic/i.test(text);

    if (hasDamageSpellTrigger && hasPsychicSwap) {
      const existingCommand = String(patched?.itemMacro?.command || "").trim();

      if (!existingCommand) {
        patched.itemMacro = {
          ...(patched.itemMacro ?? {}),
          name: String(patched?.itemMacro?.name || `${item.name} (Psychic Damage)`).trim(),
          command: [
            "if (typeof workflow === \"undefined\" || !workflow) return;",
            "const label = \"Psychic Spells\";",
            "const shouldConvert = await Dialog.confirm({",
            "  title: label,",
            "  content: `<p>Change this spell's damage type to Psychic?</p>`,",
            "  yes: () => true,",
            "  no: () => false,",
            "  defaultYes: true",
            "});",
            "if (!shouldConvert) return;",
            "if (Array.isArray(workflow.damageDetail)) {",
            "  for (const part of workflow.damageDetail) {",
            "    if (part && typeof part === \"object\") part.type = \"psychic\";",
            "  }",
            "}",
            "if (\"defaultDamageType\" in workflow) workflow.defaultDamageType = \"psychic\";"
          ].join("\n"),
        };
      }

      patched.integrationFlags = {
        ...(patched.integrationFlags ?? {}),
        "flags.midi-qol.onUseMacroName": String(
          patched?.integrationFlags?.["flags.midi-qol.onUseMacroName"] || "[postActiveEffects]ItemMacro"
        ).trim(),
      };
    }

    return patched;
  }

  function getMonsterCrGuessSnapshot(actor) {
    const system = actor.system ?? {};

    return {
      actor: {
        type: actor.type,
        size: system.traits?.size ?? null,
        ac: {
          value: system.attributes?.ac?.value ?? null,
          calc: system.attributes?.ac?.calc ?? null,
          formula: system.attributes?.ac?.formula ?? null,
        },
        hp: {
          max: system.attributes?.hp?.max ?? null,
          formula: system.attributes?.hp?.formula ?? null,
        },
        movement: foundry.utils.deepClone(system.attributes?.movement ?? {}),
        senses: foundry.utils.deepClone(system.attributes?.senses ?? {}),
        traits: {
          resistances: foundry.utils.deepClone(system.traits?.dr ?? {}),
          immunities: foundry.utils.deepClone(system.traits?.di ?? {}),
          vulnerabilities: foundry.utils.deepClone(system.traits?.dv ?? {}),
          conditionImmunities: foundry.utils.deepClone(system.traits?.ci ?? {}),
          languages: foundry.utils.deepClone(system.traits?.languages ?? {}),
        },
        abilities: summarizeAbilitiesForCrGuess(system.abilities ?? {}),
        biography: redactMonsterIdentityInfo(
          htmlToText(system.details?.biography?.value ?? "").trim().slice(0, 4000),
          actor.name,
        ),
      },
      items: actor.items.map((item) => summarizeMonsterItemForCrGuess(item, actor.name)),
    };
  }

  function getMonsterRebalanceSnapshot(actor) {
    const system = actor.system ?? {};

    return {
      actor: {
        id: actor.id,
        name: actor.name,
        type: actor.type,
        size: system.traits?.size ?? null,
        cr: system.details?.cr ?? null,
        proficiencyBonus: system.attributes?.prof ?? null,
        ac: {
          value: system.attributes?.ac?.value ?? null,
          flat: system.attributes?.ac?.flat ?? null,
          calc: system.attributes?.ac?.calc ?? null,
          formula: system.attributes?.ac?.formula ?? null,
        },
        hp: {
          value: system.attributes?.hp?.value ?? null,
          max: system.attributes?.hp?.max ?? null,
          formula: system.attributes?.hp?.formula ?? null,
        },
        movement: foundry.utils.deepClone(system.attributes?.movement ?? {}),
        senses: foundry.utils.deepClone(system.attributes?.senses ?? {}),
        spellcasting: {
          attack: system.attributes?.spell?.attack ?? null,
          dc: system.attributes?.spell?.dc ?? null,
          level: system.attributes?.spell?.level ?? null,
        },
        abilities: summarizeAbilities(system.abilities ?? {}),
        biography: htmlToText(system.details?.biography?.value ?? "").trim().slice(0, 4000),
      },
      items: actor.items.map((item) => summarizeMonsterItem(item)),
    };
  }

  function parseChallengeRating(value) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return null;

    const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const numerator = Number(fractionMatch[1]);
      const denominator = Number(fractionMatch[2]);
      if (!denominator) return null;
      return numerator / denominator;
    }

    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return numeric;
  }

  function formatChallengeRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";
    if (numeric === 0.125) return "1/8";
    if (numeric === 0.25) return "1/4";
    if (numeric === 0.5) return "1/2";
    return `${numeric}`;
  }

  function normalizeCrGuessConfidence(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
    return "medium";
  }

  function summarizeCraftingItem(item) {
    return {
      name: item.name,
      type: item.type,
      itemSubtype: item.system?.type?.value ?? null,
      quantity: item.system?.quantity ?? null,
      description: htmlToText(item.system?.description?.value ?? "").trim().slice(0, 1200),
      weight: foundry.utils.deepClone(item.system?.weight ?? {}),
      price: foundry.utils.deepClone(item.system?.price ?? {}),
    };
  }

  function summarizeJournalPage(page) {
    const textType = String(page?.type || "").trim().toLowerCase();
    if (textType && textType !== "text") return null;

    const raw = String(page?.text?.content ?? page?.text?.markdown ?? "").trim();
    if (!raw) return null;

    const normalizedText = /<[^>]+>/.test(raw) ? htmlToText(raw) : raw;
    const trimmed = String(normalizedText || "").trim();
    if (!trimmed) return null;

    return {
      name: String(page?.name || "Page").trim().slice(0, 160),
      text: trimmed.slice(0, 2500),
    };
  }

  function summarizeAbilities(abilities) {
    const summary = {};

    for (const [key, value] of Object.entries(abilities)) {
      summary[key] = {
        value: value?.value ?? null,
        mod: value?.mod ?? null,
        proficient: value?.proficient ?? null,
        save: value?.save ?? null,
      };
    }

    return summary;
  }

  function summarizeAbilitiesForCrGuess(abilities) {
    const summary = {};

    for (const [key, value] of Object.entries(abilities)) {
      summary[key] = {
        value: value?.value ?? null,
        mod: value?.mod ?? null,
      };
    }

    return summary;
  }

  function summarizeMonsterItem(item) {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      description: htmlToText(item.system?.description?.value ?? "").trim().slice(0, 4000),
      suggestedUpdatePaths: getSuggestedItemUpdatePaths(item),
      activation: foundry.utils.deepClone(item.system?.activation ?? {}),
      uses: foundry.utils.deepClone(item.system?.uses ?? {}),
      activities: summarizeActivities(item.system?.activities ?? {}),
      attackBonus: item.system?.attack?.bonus ?? null,
      save: foundry.utils.deepClone(item.system?.save ?? {}),
      damage: foundry.utils.deepClone(item.system?.damage ?? {}),
    };
  }

  function summarizeMonsterItemForCrGuess(item, actorName) {
    return {
      type: item.type,
      description: redactMonsterIdentityInfo(
        htmlToText(item.system?.description?.value ?? "").trim().slice(0, 4000),
        actorName,
      ),
      activation: foundry.utils.deepClone(item.system?.activation ?? {}),
      uses: foundry.utils.deepClone(item.system?.uses ?? {}),
      activities: summarizeActivitiesForCrGuess(item.system?.activities ?? {}, actorName),
      attackBonus: item.system?.attack?.bonus ?? null,
      save: foundry.utils.deepClone(item.system?.save ?? {}),
      damage: foundry.utils.deepClone(item.system?.damage ?? {}),
    };
  }

  function summarizeActivities(activities) {
    const summary = [];

    for (const [id, activity] of Object.entries(activities)) {
      summary.push({
        id,
        name: activity?.name ?? null,
        type: activity?.type ?? null,
        suggestedUpdatePaths: getSuggestedActivityUpdatePaths(id),
        description: htmlToText(activity?.description ?? "").trim().slice(0, 2000),
        activation: foundry.utils.deepClone(activity?.activation ?? {}),
        attack: foundry.utils.deepClone(activity?.attack ?? {}),
        damage: foundry.utils.deepClone(activity?.damage ?? {}),
        save: foundry.utils.deepClone(activity?.save ?? {}),
        range: foundry.utils.deepClone(activity?.range ?? {}),
        target: foundry.utils.deepClone(activity?.target ?? {}),
        uses: foundry.utils.deepClone(activity?.uses ?? {}),
      });
    }

    return summary;
  }

  function summarizeActivitiesForCrGuess(activities, actorName) {
    const summary = [];

    for (const [, activity] of Object.entries(activities)) {
      summary.push({
        type: activity?.type ?? null,
        description: redactMonsterIdentityInfo(
          htmlToText(activity?.description ?? "").trim().slice(0, 2000),
          actorName,
        ),
        activation: foundry.utils.deepClone(activity?.activation ?? {}),
        attack: foundry.utils.deepClone(activity?.attack ?? {}),
        damage: foundry.utils.deepClone(activity?.damage ?? {}),
        save: foundry.utils.deepClone(activity?.save ?? {}),
        range: foundry.utils.deepClone(activity?.range ?? {}),
        target: foundry.utils.deepClone(activity?.target ?? {}),
        uses: foundry.utils.deepClone(activity?.uses ?? {}),
      });
    }

    return summary;
  }

  function getSuggestedItemUpdatePaths(item) {
    const paths = ["system.description.value"];

    for (const activity of item.system?.activities ?? []) {
      paths.push(...getSuggestedActivityUpdatePaths(activity.id));
    }

    return paths;
  }

  function getSuggestedActivityUpdatePaths(activityId) {
    return [
      `system.activities.${activityId}.description`,
      `system.activities.${activityId}.activation`,
      `system.activities.${activityId}.range`,
      `system.activities.${activityId}.target`,
      `system.activities.${activityId}.attack.bonus`,
      `system.activities.${activityId}.attack.flat`,
      `system.activities.${activityId}.damage.parts`,
      `system.activities.${activityId}.damage.onSave`,
      `system.activities.${activityId}.save.ability`,
      `system.activities.${activityId}.save.dc.calculation`,
      `system.activities.${activityId}.save.dc.formula`,
      `system.activities.${activityId}.uses`,
    ];
  }

  function redactMonsterIdentityInfo(text, actorName) {
    let sanitized = String(text ?? "");

    const trimmedName = String(actorName ?? "").trim();
    if (trimmedName) {
      const escapedName = escapeRegExp(trimmedName);
      sanitized = sanitized.replace(new RegExp(escapedName, "gi"), "[REDACTED]");
    }

    sanitized = sanitized
      .replace(/challenge\s*rating\s*[:]?\s*\d+(?:\s*\/\s*\d+)?/gi, "challenge rating [REDACTED]")
      .replace(/\bcr\s*[:]?\s*\d+(?:\s*\/\s*\d+)?/gi, "CR [REDACTED]");

    return sanitized;
  }

  function escapeRegExp(value) {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    summarizeActorForJournalItems,
    getCharacterShopGenerationSnapshot,
    normalizeShopCompendiumSelections,
    buildShopStockFromCompendiumSelections,
    getCraftingGenerationSnapshot,
    getJournalGenerationSnapshot,
    getLootGenerationSnapshot,
    isBeaversCraftingIntegrationAvailable,
    enhancePayloadForKnownPatterns,
    getMonsterCrGuessSnapshot,
    getMonsterRebalanceSnapshot,
    parseChallengeRating,
    formatChallengeRating,
    normalizeCrGuessConfidence,
  };
}
