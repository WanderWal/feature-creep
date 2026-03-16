const MODULE_ID = "feature-creep";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enabled", {
    name: `${MODULE_ID}.settings.enabled.name`,
    hint: `${MODULE_ID}.settings.enabled.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "anthropicApiKey", {
    name: `${MODULE_ID}.settings.anthropicApiKey.name`,
    hint: `${MODULE_ID}.settings.anthropicApiKey.hint`,
    scope: "client",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "model", {
    name: `${MODULE_ID}.settings.model.name`,
    hint: `${MODULE_ID}.settings.model.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "claude-3-7-sonnet-latest",
  });

  game.settings.register(MODULE_ID, "maxTokens", {
    name: `${MODULE_ID}.settings.maxTokens.name`,
    hint: `${MODULE_ID}.settings.maxTokens.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 500, max: 64000, step: 100 },
    default: 3000,
  });

  game.settings.register(MODULE_ID, "requestEndpoint", {
    name: `${MODULE_ID}.settings.requestEndpoint.name`,
    hint: `${MODULE_ID}.settings.requestEndpoint.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "relayAuthHeader", {
    name: `${MODULE_ID}.settings.relayAuthHeader.name`,
    hint: `${MODULE_ID}.settings.relayAuthHeader.hint`,
    scope: "client",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "replaceGeneratedEffects", {
    name: `${MODULE_ID}.settings.replaceGeneratedEffects.name`,
    hint: `${MODULE_ID}.settings.replaceGeneratedEffects.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
  injectLegacyHeaderButton(sheet, buttons);
});

Hooks.on("getHeaderControlsItemSheet5e2", (sheet, buttons) => {
  injectV2HeaderControl(sheet, buttons);
});

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  injectV2HeaderControl(app, controls);
});

function injectLegacyHeaderButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eItemSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-button",
    icon: "fas fa-wand-magic-sparkles",
    label: game.i18n.localize(`${MODULE_ID}.button.generate`),
    onclick: async () => {
      const item = sheet.document;
      if (!item) return;
      const shouldRun = await confirmRun();
      if (!shouldRun) return;
      await generateAndApplyForItem(item);
    },
  });
}

function injectV2HeaderControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eItemSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-generate");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-generate",
    class: "feature-creep-button",
    icon: "fas fa-wand-magic-sparkles",
    label: game.i18n.localize(`${MODULE_ID}.button.generate`),
    visible: true,
    onClick: async () => {
      const item = app?.document;
      if (!item) return;
      const shouldRun = await confirmRun();
      if (!shouldRun) return;
      await generateAndApplyForItem(item);
    },
  });
}

function canUseModule() {
  return game.user?.isGM;
}

function isDnd5eItemSheet(sheet) {
  const item = sheet?.document;
  if (!item) return false;
  return game.system?.id === "dnd5e" && item.documentName === "Item";
}

async function confirmRun() {
  if (typeof DialogV2 !== "undefined") {
    const result = await DialogV2.confirm({
      window: { title: game.i18n.localize(`${MODULE_ID}.dialog.title`) },
      content: `<p>${game.i18n.localize(`${MODULE_ID}.dialog.content`)}</p>`,
      modal: true,
    });
    return Boolean(result);
  }

  return Dialog.confirm({
    title: game.i18n.localize(`${MODULE_ID}.dialog.title`),
    content: `<p>${game.i18n.localize(`${MODULE_ID}.dialog.content`)}</p>`,
    yes: () => true,
    no: () => false,
    defaultYes: true,
  });
}

async function generateAndApplyForItem(item) {
  try {
    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    const descriptionHtml = item.system?.description?.value ?? "";
    const descriptionText = htmlToText(descriptionHtml).trim();
    if (!descriptionText) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.noDescription`));
      return;
    }

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.generating`));

    const payload = await requestAnthropicGeneration({
      item,
      descriptionText,
      apiKey,
    });

    await applyPayloadToItem(item, payload);

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.success`));
  } catch (error) {
    console.error(`${MODULE_ID} | generation failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.failed`));
  }
}

async function requestAnthropicGeneration({ item, descriptionText, apiKey }) {
  const model = game.settings.get(MODULE_ID, "model");
  const maxTokens = Number(game.settings.get(MODULE_ID, "maxTokens")) || 3000;
  const configuredEndpoint = String(game.settings.get(MODULE_ID, "requestEndpoint") || "").trim();
  const requestEndpoint = configuredEndpoint || ANTHROPIC_ENDPOINT;
  const relayAuthHeader = String(game.settings.get(MODULE_ID, "relayAuthHeader") || "").trim();

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
  const parsed = parseAiJson(rawText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not parse into an object");
  }

  return enhancePayloadForKnownPatterns({
    payload: parsed,
    item,
    descriptionText,
  });
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

function parseAiJson(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }
  }

  ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.invalidResponse`));
  throw new Error("Invalid AI JSON response");
}

async function applyPayloadToItem(item, payload) {
  const updateData = {};

  if (payload.details && typeof payload.details === "object") {
    for (const [key, value] of Object.entries(payload.details)) {
      updateData[key] = value;
    }
  }

  if (Array.isArray(payload.activities)) {
    updateData["system.activities"] = toActivityMap(payload.activities);
  }

  if (Array.isArray(payload.advancements)) {
    updateData["system.advancement"] = payload.advancements;
  }

  if (Object.keys(updateData).length > 0) {
    await item.update(updateData);
  }

  if (Array.isArray(payload.effects)) {
    await applyEffects(item, payload.effects);
  }

  if (payload.itemMacro && typeof payload.itemMacro === "object") {
    await applyItemMacro(item, payload.itemMacro);
  }

  if (payload.integrationFlags && typeof payload.integrationFlags === "object") {
    await applyIntegrationFlags(item, payload.integrationFlags);
  }

  await normalizeMacroIntegration(item);
}

function toActivityMap(activities) {
  const map = {};

  for (const activity of activities) {
    const id = foundry.utils.randomID();
    map[id] = {
      _id: id,
      ...activity,
    };
  }

  return map;
}

async function applyEffects(item, effects) {
  const shouldReplaceGenerated = game.settings.get(MODULE_ID, "replaceGeneratedEffects");

  if (shouldReplaceGenerated) {
    const generated = item.effects.filter((effect) => effect.getFlag(MODULE_ID, "generated") === true);
    if (generated.length > 0) {
      await item.deleteEmbeddedDocuments(
        "ActiveEffect",
        generated.map((effect) => effect.id)
      );
    }
  }

  const createData = effects.map((effect) => ({
    ...effect,
    origin: item.uuid,
    flags: {
      ...(effect.flags ?? {}),
      [MODULE_ID]: {
        generated: true,
        generatedAt: Date.now(),
      },
    },
  }));

  if (createData.length > 0) {
    await item.createEmbeddedDocuments("ActiveEffect", createData);
  }
}

async function applyItemMacro(item, itemMacro) {
  const name = String(itemMacro.name || item.name || "Generated Item Macro").trim();
  const command = String(itemMacro.command || "");

  if (!command) return;

  await item.update({
    "flags.itemacro.macro.name": name,
    "flags.itemacro.macro.type": "script",
    "flags.itemacro.macro.command": command,
    "flags.itemacro.macro.scope": "global",
    "flags.dae.macro.command": command,
    "flags.midi-qol.onUseMacroName": "[postActiveEffects]ItemMacro",
  });
}

async function applyIntegrationFlags(item, integrationFlags) {
  const updates = {};

  for (const [path, value] of Object.entries(integrationFlags)) {
    updates[path] = value;
  }

  if (Object.keys(updates).length > 0) {
    await item.update(updates);
  }
}

async function normalizeMacroIntegration(item) {
  const itemMacro = foundry.utils.deepClone(item.flags?.itemacro?.macro ?? {});
  const daeMacro = foundry.utils.deepClone(item.flags?.dae?.macro ?? {});

  const itemMacroCommand = String(itemMacro.command ?? "").trim();
  const daeCommand = String(daeMacro.command ?? "").trim();
  const effectiveCommand = itemMacroCommand || daeCommand;

  if (!effectiveCommand) return;

  const updates = {};

  if (!itemMacroCommand) {
    updates["flags.itemacro.macro.command"] = effectiveCommand;
  }

  const name = String(itemMacro.name ?? "").trim();
  if (!name) {
    updates["flags.itemacro.macro.name"] = item.name || "Generated Item Macro";
  }

  const type = String(itemMacro.type ?? "").trim();
  if (!type) {
    updates["flags.itemacro.macro.type"] = "script";
  }

  const scope = String(itemMacro.scope ?? "").trim();
  if (!scope) {
    updates["flags.itemacro.macro.scope"] = "global";
  }

  if (!daeCommand) {
    updates["flags.dae.macro.command"] = effectiveCommand;
  }

  const onUseMacroName = String(item.flags?.["midi-qol"]?.onUseMacroName ?? "").trim();
  const normalizedOnUse = ensureItemMacroOnUse(onUseMacroName);
  if (normalizedOnUse !== onUseMacroName) {
    updates["flags.midi-qol.onUseMacroName"] = normalizedOnUse;
  }

  if (Object.keys(updates).length > 0) {
    await item.update(updates);
  }
}

function ensureItemMacroOnUse(onUseMacroName) {
  if (!onUseMacroName) return "[postActiveEffects]ItemMacro";
  if (/itemmacro/i.test(onUseMacroName)) return onUseMacroName;
  return `${onUseMacroName},[postActiveEffects]ItemMacro`;
}

function htmlToText(html) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent || element.innerText || "";
}
