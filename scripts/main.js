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

  game.settings.register(MODULE_ID, "shopCompendium", {
    name: `${MODULE_ID}.settings.shopCompendium.name`,
    hint: `${MODULE_ID}.settings.shopCompendium.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "dnd5e.items",
  });

  game.settings.register(MODULE_ID, "shopCompendiumLimit", {
    name: `${MODULE_ID}.settings.shopCompendiumLimit.name`,
    hint: `${MODULE_ID}.settings.shopCompendiumLimit.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 25, max: 500, step: 25 },
    default: 200,
  });

  game.settings.register(MODULE_ID, "shopUseFameosityPricing", {
    name: `${MODULE_ID}.settings.shopUseFameosityPricing.name`,
    hint: `${MODULE_ID}.settings.shopUseFameosityPricing.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "shopPricingRelationWeight", {
    name: `${MODULE_ID}.settings.shopPricingRelationWeight.name`,
    hint: `${MODULE_ID}.settings.shopPricingRelationWeight.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 5 },
    default: 75,
  });

  game.settings.register(MODULE_ID, "shopPricingTendencyWeight", {
    name: `${MODULE_ID}.settings.shopPricingTendencyWeight.name`,
    hint: `${MODULE_ID}.settings.shopPricingTendencyWeight.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 5 },
    default: 25,
  });

  game.settings.register(MODULE_ID, "shopPricingBuyImpact", {
    name: `${MODULE_ID}.settings.shopPricingBuyImpact.name`,
    hint: `${MODULE_ID}.settings.shopPricingBuyImpact.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.45,
  });

  game.settings.register(MODULE_ID, "shopPricingSellImpact", {
    name: `${MODULE_ID}.settings.shopPricingSellImpact.name`,
    hint: `${MODULE_ID}.settings.shopPricingSellImpact.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.6,
  });
});

Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
  injectLegacyHeaderButton(sheet, buttons);
});

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  injectLegacyActorHeaderButton(sheet, buttons);
  injectLegacyActorGuessButton(sheet, buttons);
  injectLegacyActorLootButton(sheet, buttons);
  injectLegacyActorCraftButton(sheet, buttons);
  injectLegacyActorShopButton(sheet, buttons);
});

Hooks.on("getJournalSheetHeaderButtons", (sheet, buttons) => {
  injectLegacyJournalItemsButton(sheet, buttons);
});

Hooks.on("getHeaderControlsItemSheet5e2", (sheet, buttons) => {
  injectV2HeaderControl(sheet, buttons);
});

Hooks.on("getHeaderControlsActorSheet5e2", (sheet, buttons) => {
  injectV2ActorHeaderControl(sheet, buttons);
  injectV2ActorGuessControl(sheet, buttons);
  injectV2ActorLootControl(sheet, buttons);
  injectV2ActorCraftControl(sheet, buttons);
  injectV2ActorShopControl(sheet, buttons);
});

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  injectV2HeaderControl(app, controls);
  injectV2ActorHeaderControl(app, controls);
  injectV2ActorGuessControl(app, controls);
  injectV2ActorLootControl(app, controls);
  injectV2ActorCraftControl(app, controls);
  injectV2ActorShopControl(app, controls);
  injectV2JournalItemsControl(app, controls);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;

  const notesGroup = Array.isArray(controls) ? controls.find((c) => c?.name === "notes") : null;
  if (!notesGroup?.tools) return;

  const existing = notesGroup.tools.find((t) => t?.name === "feature-creep-improvise");
  if (existing) return;

  notesGroup.tools.push({
    name: "feature-creep-improvise",
    title: game.i18n.localize(`${MODULE_ID}.button.improvise`),
    icon: "fas fa-theater-masks",
    button: true,
    onClick: () => openImproviseDialog(),
  });
});

Hooks.once("ready", () => {
  const module = game.modules?.get(MODULE_ID);
  if (module) {
    module.api = { improvise: openImproviseDialog };
  }
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

function injectLegacyActorHeaderButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-rebalance-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-rebalance-button",
    icon: "fas fa-scale-balanced",
    label: game.i18n.localize(`${MODULE_ID}.button.rebalance`),
    onclick: async () => {
      const actor = sheet.document;
      if (!actor) return;
      const targetCr = await promptForTargetCr(actor);
      if (targetCr === null) return;
      await rebalanceMonsterForCr(actor, targetCr);
    },
  });
}

function injectLegacyActorGuessButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-guess-cr-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-guess-cr-button",
    icon: "fas fa-magnifying-glass-chart",
    label: game.i18n.localize(`${MODULE_ID}.button.guessCr`),
    onclick: async () => {
      const actor = sheet.document;
      if (!actor) return;
      await guessMonsterCr(actor);
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

function injectV2ActorHeaderControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-rebalance");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-rebalance",
    class: "feature-creep-rebalance-button",
    icon: "fas fa-scale-balanced",
    label: game.i18n.localize(`${MODULE_ID}.button.rebalance`),
    visible: true,
    onClick: async () => {
      const actor = app?.document;
      if (!actor) return;
      const targetCr = await promptForTargetCr(actor);
      if (targetCr === null) return;
      await rebalanceMonsterForCr(actor, targetCr);
    },
  });
}

function injectV2ActorGuessControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-guess-cr");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-guess-cr",
    class: "feature-creep-guess-cr-button",
    icon: "fas fa-magnifying-glass-chart",
    label: game.i18n.localize(`${MODULE_ID}.button.guessCr`),
    visible: true,
    onClick: async () => {
      const actor = app?.document;
      if (!actor) return;
      await guessMonsterCr(actor);
    },
  });
}

function injectLegacyActorLootButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-loot-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-loot-button",
    icon: "fas fa-coins",
    label: game.i18n.localize(`${MODULE_ID}.button.generateLoot`),
    onclick: async () => {
      const actor = sheet.document;
      if (!actor) return;
      await generateLootForActor(actor);
    },
  });
}

function injectV2ActorLootControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-generate-loot");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-generate-loot",
    class: "feature-creep-loot-button",
    icon: "fas fa-coins",
    label: game.i18n.localize(`${MODULE_ID}.button.generateLoot`),
    visible: true,
    onClick: async () => {
      const actor = app?.document;
      if (!actor) return;
      await generateLootForActor(actor);
    },
  });
}

function injectLegacyActorCraftButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eCraftingActorSheet(sheet)) return;
  if (getActorCraftingTools(sheet.document).length === 0) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-craft-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-craft-button",
    icon: "fas fa-hammer",
    label: game.i18n.localize(`${MODULE_ID}.button.craft`),
    onclick: async () => {
      const actor = sheet.document;
      if (!actor) return;
      await generateCraftedItemsForActor(actor);
    },
  });
}

function injectV2ActorCraftControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eCraftingActorSheet(app)) return;
  if (getActorCraftingTools(app.document).length === 0) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-craft-items");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-craft-items",
    class: "feature-creep-craft-button",
    icon: "fas fa-hammer",
    label: game.i18n.localize(`${MODULE_ID}.button.craft`),
    visible: true,
    onClick: async () => {
      const actor = app?.document;
      if (!actor) return;
      await generateCraftedItemsForActor(actor);
    },
  });
}

function injectLegacyActorShopButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-shop-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-shop-button",
    icon: "fas fa-store",
    label: game.i18n.localize(`${MODULE_ID}.button.generateShop`),
    onclick: async () => {
      const actor = sheet.document;
      if (!actor) return;
      await generateShopForCharacter(actor);
    },
  });
}

function injectV2ActorShopControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isDnd5eNpcSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-generate-shop");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-generate-shop",
    class: "feature-creep-shop-button",
    icon: "fas fa-store",
    label: game.i18n.localize(`${MODULE_ID}.button.generateShop`),
    visible: true,
    onClick: async () => {
      const actor = app?.document;
      if (!actor) return;
      await generateShopForCharacter(actor);
    },
  });
}

function injectLegacyJournalItemsButton(sheet, buttons) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isJournalSheet(sheet)) return;

  const existingButton = buttons.find((button) => button?.class === "feature-creep-journal-items-button");
  if (existingButton) return;

  buttons.unshift({
    class: "feature-creep-journal-items-button",
    icon: "fas fa-book-open",
    label: game.i18n.localize(`${MODULE_ID}.button.generateJournalItems`),
    onclick: async () => {
      const source = sheet.document;
      if (!source) return;
      await generateItemsFromJournal(source);
    },
  });
}

function injectV2JournalItemsControl(app, controls) {
  if (!Array.isArray(controls)) return;
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!canUseModule()) return;
  if (!isJournalSheet(app)) return;

  const existingControl = controls.find((control) => control?.action === "feature-creep-generate-journal-items");
  if (existingControl) return;

  controls.unshift({
    action: "feature-creep-generate-journal-items",
    class: "feature-creep-journal-items-button",
    icon: "fas fa-book-open",
    label: game.i18n.localize(`${MODULE_ID}.button.generateJournalItems`),
    visible: true,
    onClick: async () => {
      const source = app?.document;
      if (!source) return;
      await generateItemsFromJournal(source);
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

function isDnd5eNpcSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  return game.system?.id === "dnd5e" && actor.documentName === "Actor" && actor.type === "npc";
}

function isDnd5eCharacterSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  return game.system?.id === "dnd5e" && actor.documentName === "Actor" && actor.type === "character";
}

function isDnd5eCraftingActorSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  if (game.system?.id !== "dnd5e" || actor.documentName !== "Actor") return false;
  return actor.type === "character" || actor.type === "npc";
}

function isJournalSheet(sheet) {
  const document = sheet?.document;
  if (!document) return false;
  return document.documentName === "JournalEntry" || document.documentName === "JournalEntryPage";
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

async function promptForTargetCr(actor) {
  const currentCr = formatChallengeRating(actor.system?.details?.cr) || "0";

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialog = new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.rebalanceDialog.title`),
      content: `
        <form class="feature-creep-rebalance-form">
          <p>${game.i18n.format(`${MODULE_ID}.rebalanceDialog.content`, {
            name: foundry.utils.escapeHTML(actor.name ?? ""),
            currentCr,
          })}</p>
          <div class="form-group">
            <label for="feature-creep-target-cr">${game.i18n.localize(`${MODULE_ID}.rebalanceDialog.targetLabel`)}</label>
            <input id="feature-creep-target-cr" name="targetCr" type="text" value="${foundry.utils.escapeHTML(currentCr)}" placeholder="1/2" />
          </div>
        </form>
      `,
      buttons: {
        cancel: {
          label: game.i18n.localize("Cancel"),
          callback: () => finish(null),
        },
        submit: {
          label: game.i18n.localize(`${MODULE_ID}.rebalanceDialog.submit`),
          callback: (html) => {
            const input = html?.[0]?.querySelector("[name='targetCr']");
            const targetCr = parseChallengeRating(input?.value ?? "");
            if (targetCr === null) {
              ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.invalidTargetCr`));
              finish(null);
              return;
            }

            finish(targetCr);
          },
        },
      },
      default: "submit",
      close: () => finish(null),
      render: (html) => {
        const input = html?.[0]?.querySelector("[name='targetCr']");
        input?.focus();
        input?.select();
      },
    });

    dialog.render(true);
  });
}

async function generateAndApplyForItem(item) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

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

async function rebalanceMonsterForCr(actor, targetCr) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.rebalancing`, {
      name: actor.name,
      cr: formatChallengeRating(targetCr),
    }));

    const payload = await requestMonsterRebalance({
      actor,
      targetCr,
      apiKey,
    });

    await applyMonsterRebalance(actor, payload, targetCr);

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.rebalanceSuccess`, {
      name: actor.name,
      cr: formatChallengeRating(targetCr),
    }));
  } catch (error) {
    console.error(`${MODULE_ID} | monster rebalance failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.rebalanceFailed`));
  }
}

async function guessMonsterCr(actor) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.guessingCr`));

    const result = await requestMonsterCrGuess({
      actor,
      apiKey,
    });

    showCrGuessResultDialog(actor, result);
  } catch (error) {
    console.error(`${MODULE_ID} | monster CR guess failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.guessCrFailed`));
  }
}

async function generateCraftedItemsForActor(actor) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    const selection = await promptForCraftingSelection(actor);
    if (!selection) return;

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.generatingCraft`, {
      tool: selection.artisanTool.name,
    }));

    const result = await requestCraftedItems({
      artisanTool: selection.artisanTool,
      toolProficiencyProfile: getToolProficiencyProfile(actor, selection.artisanTool),
      ingredientResources: selection.ingredientResources,
      notes: selection.notes,
      apiKey,
    });

    showCraftedItemsDialog(actor, selection.artisanTool, selection.ingredientResources, result);
  } catch (error) {
    console.error(`${MODULE_ID} | craft generation failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.craftFailed`));
  }
}

async function promptForCraftingSelection(actor) {
  const availableTools = getActorCraftingTools(actor);
  if (availableTools.length === 0) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.noCraftingTools`));
    return null;
  }

  const ingredientItems = getActorCraftingIngredientItems(actor);
  if (ingredientItems.length === 0) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.noCraftingItems`));
    return null;
  }

  const toolOptions = availableTools.map((tool) => `
    <option value="${tool.id}">${foundry.utils.escapeHTML(tool.name)}</option>
  `).join("");

  const ingredientOptions = ingredientItems.map((item) => `
    <label class="feature-creep-crafting-item">
      <input type="checkbox" name="ingredientIds" value="${item.id}" />
      <span>${foundry.utils.escapeHTML(formatCraftingIngredientLabel(item))}</span>
      <input
        class="feature-creep-resource-qty"
        type="number"
        data-item-id="${item.id}"
        min="1"
        max="${getItemAvailableQuantity(item)}"
        value="1"
        aria-label="${foundry.utils.escapeHTML(game.i18n.localize(`${MODULE_ID}.craftDialog.resourceQtyLabel`))}"
      />
    </label>
  `).join("");

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialog = new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.craftDialog.title`),
      content: `
        <form class="feature-creep-crafting-form">
          <p>${game.i18n.localize(`${MODULE_ID}.craftDialog.content`)}</p>
          <div class="form-group">
            <label for="feature-creep-crafting-tool">${game.i18n.localize(`${MODULE_ID}.craftDialog.toolLabel`)}</label>
            <select id="feature-creep-crafting-tool" name="artisanToolId">${toolOptions}</select>
          </div>
          <div class="form-group stacked">
            <label>${game.i18n.localize(`${MODULE_ID}.craftDialog.ingredientsLabel`)}</label>
            <div class="feature-creep-crafting-items">${ingredientOptions}</div>
          </div>
          <div class="form-group stacked">
            <label for="feature-creep-crafting-notes">${game.i18n.localize(`${MODULE_ID}.craftDialog.notesLabel`)}</label>
            <textarea id="feature-creep-crafting-notes" name="craftNotes" rows="3" placeholder="${foundry.utils.escapeHTML(game.i18n.localize(`${MODULE_ID}.craftDialog.notesPlaceholder`))}"></textarea>
          </div>
        </form>
      `,
      buttons: {
        cancel: {
          label: game.i18n.localize("Cancel"),
          callback: () => finish(null),
        },
        submit: {
          label: game.i18n.localize(`${MODULE_ID}.craftDialog.submit`),
          callback: (html) => {
            const root = html?.[0];
            const artisanToolId = String(root?.querySelector("[name='artisanToolId']")?.value || "").trim();
            const notes = String(root?.querySelector("[name='craftNotes']")?.value || "").trim().slice(0, 1200);
            const ingredientIds = Array.from(root?.querySelectorAll("[name='ingredientIds']:checked") ?? [])
              .map((input) => String(input.value || "").trim())
              .filter(Boolean);

            const artisanTool = actor.items.get(artisanToolId);
            if (!artisanTool || !isCraftingTool(artisanTool)) {
              ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.invalidCraftTool`));
              finish(null);
              return;
            }

            const selectedItems = ingredientIds
              .map((id) => actor.items.get(id))
              .filter((item) => item && item.id !== artisanToolId);

            if (selectedItems.length === 0) {
              ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.selectCraftItems`));
              finish(null);
              return;
            }

            const quantityById = new Map(
              Array.from(root?.querySelectorAll(".feature-creep-resource-qty") ?? []).map((input) => [
                String(input?.dataset?.itemId || "").trim(),
                Number(input?.value ?? 1),
              ])
            );

            const ingredientResources = selectedItems.map((item) => {
              const available = getItemAvailableQuantity(item);
              const requested = Number(quantityById.get(item.id) ?? 1);
              const quantity = Math.max(1, Math.min(available, Math.round(requested || 1)));
              return { item, quantity, available };
            });

            finish({ artisanTool, ingredientResources, notes });
          },
        },
      },
      default: "submit",
      close: () => finish(null),
      render: (html) => {
        html?.[0]?.querySelector("[name='artisanToolId']")?.focus();
      },
    });

    dialog.render(true);
  });
}

async function generateLootForActor(actor) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.generatingLoot`, {
      name: actor.name,
    }));

    const result = await requestMonsterLoot({ actor, apiKey });

    showLootGenerationDialog(actor, result);
  } catch (error) {
    console.error(`${MODULE_ID} | loot generation failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.lootFailed`));
  }
}

async function generateItemsFromJournal(sourceDocument) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    const snapshot = getJournalGenerationSnapshot(sourceDocument);
    if (!snapshot) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.noJournalContent`));
      return;
    }

    const selectedActor = await promptForJournalActorSelection();
    if (selectedActor === null) return;

    const actorSnapshot = selectedActor ? summarizeActorForJournalItems(selectedActor) : null;

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.generatingJournalItems`, {
      name: snapshot.name,
    }));

    const result = await requestJournalItems({ snapshot, actorSnapshot, apiKey });

    showJournalItemsDialog(sourceDocument, result);
  } catch (error) {
    console.error(`${MODULE_ID} | journal item generation failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.journalItemsFailed`));
  }
}

async function generateShopForCharacter(actor) {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    if (!isItemPilesShopIntegrationAvailable()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.shopIntegrationMissing`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    const packId = String(game.settings.get(MODULE_ID, "shopCompendium") || "").trim();
    if (!packId) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.shopCompendiumMissing`));
      return;
    }

    const compendiumPack = game.packs?.get(packId) ?? null;
    if (!compendiumPack) {
      ui.notifications.warn(game.i18n.format(`${MODULE_ID}.notifications.shopCompendiumNotFound`, {
        pack: packId,
      }));
      return;
    }

    const compendiumCandidates = await getShopCompendiumCandidates(compendiumPack);
    if (compendiumCandidates.length === 0) {
      ui.notifications.warn(game.i18n.format(`${MODULE_ID}.notifications.shopCompendiumNoCandidates`, {
        pack: packId,
      }));
      return;
    }

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.generatingShop`, {
      name: actor.name,
    }));

    const result = await requestCharacterShopSetup({
      actor,
      apiKey,
      compendiumPack,
      compendiumCandidates,
    });

    showCharacterShopDialog(actor, result);
  } catch (error) {
    console.error(`${MODULE_ID} | shop generation failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.shopFailed`));
  }
}

async function openImproviseDialog() {
  try {
    if (!canUseModule()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.gmOnly`));
      return;
    }

    const apiKey = game.settings.get(MODULE_ID, "anthropicApiKey")?.trim();
    if (!apiKey) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.apiKeyMissing`));
      return;
    }

    const selection = await promptForImproviseSelection();
    if (!selection) return;

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.generatingImprovise`));

    const result = await requestImprovise({ ...selection, apiKey });

    showImproviseResultDialog(result);
  } catch (error) {
    console.error(`${MODULE_ID} | improvise failed`, error);

    const message = String(error?.message || "");
    const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
    if (isCorsError) {
      ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.corsBlocked`));
      return;
    }

    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.improviseFailed`));
  }
}

async function promptForImproviseSelection() {
  const journals = getImproviseCandidateJournals();
  const actors = getJournalCandidateActors();

  const journalOptions = journals.map((j) => `
    <label class="feature-creep-improvise-item">
      <input type="checkbox" name="journalIds" value="${j.id}" />
      <span>${foundry.utils.escapeHTML(j.name)}</span>
    </label>
  `).join("");

  const actorOptions = actors.map((a) => `
    <label class="feature-creep-improvise-item">
      <input type="checkbox" name="actorIds" value="${a.id}" />
      <span>${foundry.utils.escapeHTML(a.name)}</span>
    </label>
  `).join("");

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const dialog = new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.improviseDialog.title`),
      content: `
        <form class="feature-creep-improvise-form">
          <p>${game.i18n.localize(`${MODULE_ID}.improviseDialog.content`)}</p>
          <div class="form-group stacked">
            <label for="feature-creep-improvise-situation">${game.i18n.localize(`${MODULE_ID}.improviseDialog.situationLabel`)}</label>
            <textarea id="feature-creep-improvise-situation" name="situation" rows="4" placeholder="${foundry.utils.escapeHTML(game.i18n.localize(`${MODULE_ID}.improviseDialog.situationPlaceholder`))}"></textarea>
          </div>
          ${journals.length > 0 ? `
          <div class="form-group stacked">
            <label>${game.i18n.localize(`${MODULE_ID}.improviseDialog.journalsLabel`)}</label>
            <div class="feature-creep-improvise-list">${journalOptions}</div>
          </div>
          ` : ""}
          ${actors.length > 0 ? `
          <div class="form-group stacked">
            <label>${game.i18n.localize(`${MODULE_ID}.improviseDialog.actorsLabel`)}</label>
            <div class="feature-creep-improvise-list">${actorOptions}</div>
          </div>
          ` : ""}
        </form>
      `,
      buttons: {
        cancel: {
          label: game.i18n.localize("Cancel"),
          callback: () => finish(null),
        },
        submit: {
          label: game.i18n.localize(`${MODULE_ID}.improviseDialog.submit`),
          callback: (html) => {
            const root = html?.[0];
            const situation = String(root?.querySelector("[name='situation']")?.value || "").trim();
            if (!situation) {
              ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.improviseNoSituation`));
              finish(null);
              return;
            }

            const journalIds = Array.from(root?.querySelectorAll("[name='journalIds']:checked") ?? [])
              .map((i) => String(i.value || "").trim())
              .filter(Boolean);

            const actorIds = Array.from(root?.querySelectorAll("[name='actorIds']:checked") ?? [])
              .map((i) => String(i.value || "").trim())
              .filter(Boolean);

            const selectedJournals = journalIds.map((id) => game.journal?.get(id)).filter(Boolean);
            const selectedActors = actorIds.map((id) => game.actors?.get(id)).filter(Boolean);

            finish({ situation, selectedJournals, selectedActors });
          },
        },
      },
      default: "submit",
      close: () => finish(null),
      render: (html) => {
        html?.[0]?.querySelector("[name='situation']")?.focus();
      },
    });

    dialog.render(true);
  });
}

function getImproviseCandidateJournals() {
  return Array.from(game.journal ?? [])
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

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

  const userParts = [
    `Situation to improvise:\n${situation}`,
  ];

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

function showImproviseResultDialog(result) {
  const opening = foundry.utils.escapeHTML(result.opening || "");

  const npcHtml = result.npcReactions.length > 0
    ? `<ul>${result.npcReactions.map((r) =>
        `<li><strong>${foundry.utils.escapeHTML(String(r?.name || ""))}</strong>: ${foundry.utils.escapeHTML(String(r?.reaction || ""))}</li>`
      ).join("")}</ul>`
    : "";

  const outcomesHtml = result.outcomes.length > 0
    ? `<ul>${result.outcomes.map((o) => `<li>${foundry.utils.escapeHTML(o)}</li>`).join("")}</ul>`
    : "";

  const mechanicsHtml = result.mechanics.length > 0
    ? `<ul>${result.mechanics.map((m) => `<li>${foundry.utils.escapeHTML(m)}</li>`).join("")}</ul>`
    : "";

  const dmTips = foundry.utils.escapeHTML(result.dmTips || "");

  const content = `
    <div class="feature-creep-improvise-result">
      ${opening ? `<div class="feature-creep-improvise-section">
        <h3>${game.i18n.localize(`${MODULE_ID}.improviseResult.openingLabel`)}</h3>
        <p class="feature-creep-improvise-opening">${opening}</p>
      </div>` : ""}
      ${npcHtml ? `<div class="feature-creep-improvise-section">
        <h3>${game.i18n.localize(`${MODULE_ID}.improviseResult.npcReactionsLabel`)}</h3>
        ${npcHtml}
      </div>` : ""}
      ${outcomesHtml ? `<div class="feature-creep-improvise-section">
        <h3>${game.i18n.localize(`${MODULE_ID}.improviseResult.outcomesLabel`)}</h3>
        ${outcomesHtml}
      </div>` : ""}
      ${mechanicsHtml ? `<div class="feature-creep-improvise-section">
        <h3>${game.i18n.localize(`${MODULE_ID}.improviseResult.mechanicsLabel`)}</h3>
        ${mechanicsHtml}
      </div>` : ""}
      ${dmTips ? `<div class="feature-creep-improvise-section feature-creep-improvise-tips">
        <h3>${game.i18n.localize(`${MODULE_ID}.improviseResult.dmTipsLabel`)}</h3>
        <p><em>${dmTips}</em></p>
      </div>` : ""}
    </div>
  `;

  const dialog = new Dialog({
    title: game.i18n.localize(`${MODULE_ID}.improviseResult.title`),
    content,
    buttons: {
      post: {
        label: game.i18n.localize(`${MODULE_ID}.improviseResult.postToChat`),
        callback: () => postImproviseToChat(result),
      },
      close: {
        label: game.i18n.localize("Close"),
      },
    },
    default: "close",
  });

  dialog.render(true);
}

async function postImproviseToChat(result) {
  const lines = [];

  if (result.opening) {
    lines.push(`<p><strong>${game.i18n.localize(`${MODULE_ID}.improviseResult.openingLabel`)}</strong></p>`);
    lines.push(`<p>${foundry.utils.escapeHTML(result.opening)}</p>`);
  }

  if (result.npcReactions.length > 0) {
    lines.push(`<p><strong>${game.i18n.localize(`${MODULE_ID}.improviseResult.npcReactionsLabel`)}</strong></p>`);
    lines.push(`<ul>${result.npcReactions.map((r) =>
      `<li><strong>${foundry.utils.escapeHTML(String(r?.name || ""))}</strong>: ${foundry.utils.escapeHTML(String(r?.reaction || ""))}</li>`
    ).join("")}</ul>`);
  }

  if (result.outcomes.length > 0) {
    lines.push(`<p><strong>${game.i18n.localize(`${MODULE_ID}.improviseResult.outcomesLabel`)}</strong></p>`);
    lines.push(`<ul>${result.outcomes.map((o) => `<li>${foundry.utils.escapeHTML(o)}</li>`).join("")}</ul>`);
  }

  if (result.mechanics.length > 0) {
    lines.push(`<p><strong>${game.i18n.localize(`${MODULE_ID}.improviseResult.mechanicsLabel`)}</strong></p>`);
    lines.push(`<ul>${result.mechanics.map((m) => `<li>${foundry.utils.escapeHTML(m)}</li>`).join("")}</ul>`);
  }

  if (result.dmTips) {
    lines.push(`<p><strong>${game.i18n.localize(`${MODULE_ID}.improviseResult.dmTipsLabel`)}</strong></p>`);
    lines.push(`<p><em>${foundry.utils.escapeHTML(result.dmTips)}</em></p>`);
  }

  await ChatMessage.create({
    content: lines.join("\n"),
    whisper: ChatMessage.getWhisperRecipients("GM"),
  });

  ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.improvisePostedToChat`));
}

async function promptForJournalActorSelection() {
  const actors = getJournalCandidateActors();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const actorOptions = [
      `<option value="">${foundry.utils.escapeHTML(game.i18n.localize(`${MODULE_ID}.journalDialog.actorNone`))}</option>`,
      ...actors.map((actor) => `<option value="${actor.id}">${foundry.utils.escapeHTML(actor.name)}</option>`),
    ].join("");

    const dialog = new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.journalDialog.actorPromptTitle`),
      content: `
        <form class="feature-creep-journal-actor-form">
          <p>${game.i18n.localize(`${MODULE_ID}.journalDialog.actorPromptContent`)}</p>
          <div class="form-group">
            <label for="feature-creep-journal-actor">${game.i18n.localize(`${MODULE_ID}.journalDialog.actorLabel`)}</label>
            <select id="feature-creep-journal-actor" name="journalActorId">${actorOptions}</select>
          </div>
        </form>
      `,
      buttons: {
        cancel: {
          label: game.i18n.localize("Cancel"),
          callback: () => finish(null),
        },
        submit: {
          label: game.i18n.localize(`${MODULE_ID}.journalDialog.actorSubmit`),
          callback: (html) => {
            const root = html?.[0];
            const actorId = String(root?.querySelector("[name='journalActorId']")?.value || "").trim();
            if (!actorId) {
              finish(undefined);
              return;
            }

            const actor = game.actors?.get(actorId) ?? null;
            finish(actor || undefined);
          },
        },
      },
      default: "submit",
      close: () => finish(null),
      render: (html) => {
        html?.[0]?.querySelector("[name='journalActorId']")?.focus();
      },
    });

    dialog.render(true);
  });
}

function getJournalCandidateActors() {
  return Array.from(game.actors ?? [])
    .filter((actor) => actor?.type === "character" || actor?.type === "npc")
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
}

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
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.invalidResponse`));
    throw new Error("No valid compendium selections in AI shop response");
  }

  const builtStock = await buildShopStockFromCompendiumSelections(compendiumPack, selections);
  if (builtStock.stockItems.length === 0) {
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.invalidResponse`));
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

async function getShopCompendiumCandidates(compendiumPack) {
  const supportedTypes = new Set(["loot", "weapon", "equipment", "consumable", "tool", "container"]);
  const limit = Math.max(25, Math.min(500, Number(game.settings.get(MODULE_ID, "shopCompendiumLimit")) || 200));

  const index = await compendiumPack.getIndex({
    fields: ["name", "type", "system.price", "system.description.value"],
  });

  return Array.from(index)
    .filter((entry) => supportedTypes.has(String(entry.type || "").trim().toLowerCase()))
    .filter((entry) => String(entry.name || "").trim())
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
    .slice(0, limit)
    .map((entry) => ({
      id: String(entry._id || "").trim(),
      name: String(entry.name || "").trim(),
      type: normalizeGeneratedItemType(entry.type),
      price: foundry.utils.deepClone(entry.system?.price ?? {}),
      summary: htmlToText(entry.system?.description?.value ?? "").trim().slice(0, 180),
    }))
    .filter((entry) => entry.id);
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

function showCharacterShopDialog(actor, result) {
  const items = Array.isArray(result.inventory) ? result.inventory : [];
  const rationale = foundry.utils.escapeHTML(result.rationale || "");
  const shopDescription = foundry.utils.escapeHTML(result.shopDescription || "");
  const tableHtml = buildGeneratedItemTable(items, `${MODULE_ID}.shopDialog.noItems`);

  const buttons = {
    close: {
      label: game.i18n.localize("Close"),
    },
  };

  if (items.length > 0) {
    buttons.apply = {
      label: game.i18n.localize(`${MODULE_ID}.shopDialog.apply`),
      callback: () => applyCharacterShopToActor(actor, result),
    };
  }

  const dialog = new Dialog({
    title: game.i18n.format(`${MODULE_ID}.shopDialog.title`, {
      name: foundry.utils.escapeHTML(actor.name ?? ""),
    }),
    content: `
      <div class="feature-creep-shop-result">
        <p><strong>${game.i18n.localize(`${MODULE_ID}.shopDialog.shopName`)}</strong>: ${foundry.utils.escapeHTML(result.shopName || actor.name || "")}</p>
        ${shopDescription ? `<p><strong>${game.i18n.localize(`${MODULE_ID}.shopDialog.shopDescription`)}</strong>: ${shopDescription}</p>` : ""}
        ${tableHtml}
        ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
      </div>`,
    buttons,
    default: items.length > 0 ? "apply" : "close",
  });

  dialog.render(true);
}

async function applyCharacterShopToActor(actor, result) {
  try {
    if (!isItemPilesShopIntegrationAvailable()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.shopIntegrationMissing`));
      return;
    }

    const api = game.itempiles?.API;
    const items = Array.isArray(result.inventory) ? result.inventory : [];
    const stockItems = Array.isArray(result.stockItems) ? result.stockItems : [];

    const normalizedMerchant = normalizeAiMerchantModifiers(result?.merchant);
    const existingShopDescription = getExistingShopDescription(actor);
    const generatedShopDescription = String(result.shopDescription || "").trim().slice(0, 2000);

    const merchantData = {
      enabled: true,
      type: "merchant",
      closed: false,
      locked: false,
      buyPriceModifier: normalizedMerchant.buyPriceModifier,
      sellPriceModifier: normalizedMerchant.sellPriceModifier,
      overrideSingleItemScale: true,
      singleItemScale: 1,
      description: existingShopDescription || generatedShopDescription,
      shopName: String(result.shopName || actor.name || "").trim().slice(0, 120),
      openTimes: {
        enabled: Boolean(result?.merchant?.openTimesEnabled),
      },
    };

    const baseSpread = normalizeMerchantPriceSpread(
      merchantData.buyPriceModifier,
      merchantData.sellPriceModifier,
    );
    merchantData.buyPriceModifier = baseSpread.buyPriceModifier;
    merchantData.sellPriceModifier = baseSpread.sellPriceModifier;

    if (typeof api?.updateItemPile === "function") {
      await api.updateItemPile(actor, merchantData);
    } else {
      await actor.update({
        "flags.item-piles.data": merchantData,
      });
    }

    const addData = stockItems.length > 0
      ? stockItems.map((entry) => {
        const item = foundry.utils.deepClone(entry.item ?? {});
        const quantity = Math.max(1, Math.min(99, Math.round(Number(entry.quantity) || 1)));

        foundry.utils.setProperty(item, "system.quantity", quantity);
        item.flags = item.flags ?? {};
        item.flags[MODULE_ID] = {
          ...(item.flags[MODULE_ID] ?? {}),
          generatedShopStock: true,
          generatedAt: Date.now(),
        };

        return {
          item,
          quantity,
        };
      })
      : items.map((item) => ({
          item: {
            name: item.name,
            type: item.type,
            system: {
              description: {
                value: item.description ? `<p>${item.description}</p>` : "",
              },
              quantity: item.quantity,
              weight: {
                value: item.weightValue,
                units: item.weightUnits,
              },
              price: {
                value: item.priceValue,
                denomination: item.priceDenom,
              },
            },
            flags: {
              [MODULE_ID]: {
                generatedShopStock: true,
                generatedAt: Date.now(),
              },
            },
          },
          quantity: item.quantity,
        }));

    if (addData.length > 0) {

      if (typeof api?.addItems === "function") {
        await api.addItems(actor, addData);
      } else {
        await actor.createEmbeddedDocuments("Item", addData.map((entry) => entry.item));
      }
    }

    const pricingResult = await applyFameosityPricingToMerchant(actor, merchantData);

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.shopApplied`, {
      count: items.length,
      name: actor.name,
    }));

    if (pricingResult.applied) {
      ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.shopPricingApplied`, {
        count: pricingResult.count,
      }));
    }
  } catch (error) {
    console.error(`${MODULE_ID} | failed to apply generated shop`, error);
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.shopApplyFailed`));
  }
}

function clampShopModifier(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(10, numeric));
}

function parseAiMerchantModifier(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;

  // Accept percent-style outputs from AI (e.g. 110, 50) and convert to decimal multipliers.
  if (numeric > 10) {
    return clampShopModifier(numeric / 100, fallback);
  }

  return clampShopModifier(numeric, fallback);
}

function normalizeAiMerchantModifiers(merchant) {
  let buyPriceModifier = parseAiMerchantModifier(merchant?.buyPriceModifier, 1.1);
  let sellPriceModifier = parseAiMerchantModifier(merchant?.sellPriceModifier, 0.5);

  // Correct common AI field inversion (buy/sell swapped).
  if (buyPriceModifier < sellPriceModifier) {
    const previousBuy = buyPriceModifier;
    buyPriceModifier = sellPriceModifier;
    sellPriceModifier = previousBuy;
  }

  return normalizeMerchantPriceSpread(buyPriceModifier, sellPriceModifier);
}

function getExistingShopDescription(actor) {
  const fromItemPilesFlag = foundry.utils.getProperty(actor, "flags.item-piles.data.description");
  if (typeof fromItemPilesFlag === "string" && fromItemPilesFlag.trim()) {
    return fromItemPilesFlag.trim();
  }

  return "";
}

function isItemPilesShopIntegrationAvailable() {
  const itemPiles = game.modules?.get("item-piles")?.active;
  const dnd5eBridge = game.modules?.get("itempilesdnd5e")?.active;
  const apiAvailable = Boolean(game.itempiles?.API);

  return Boolean(itemPiles && dnd5eBridge && apiAvailable);
}

async function requestCraftedItems({ artisanTool, toolProficiencyProfile, ingredientResources, notes, apiKey }) {
  const recipeIntegrationActive = isBeaversCraftingIntegrationAvailable();

  const systemPrompt = [
    "You are a D&D5e (2024) crafting assistant for Foundry VTT used by a DM to build a crafting system.",
    "Return ONLY valid JSON, no markdown.",
    "The JSON object must contain these keys: items (array), rationale (string).",
    "- items: array of 0-4 crafted output items.",
    "- Each output item must have: name (string), type (one of: material|loot|weapon|equipment|consumable|tool|container|treasure), quantity (number >= 1), craftingDc (number), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number >= 0) and denomination (one of: cp|sp|ep|gp|pp)).",
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
  ].join("\n\n");

  const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not parse into an object");
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

  return { items, rationale };
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

function getToolProficiencyProfile(actor, toolItem) {
  const toolKey = String(toolItem?.system?.type?.baseItem || "").trim();
  const toolData = toolKey ? actor.system?.tools?.[toolKey] ?? null : null;
  const total = Number(toolData?.total);
  const proficiencyValue = Number(toolData?.value);

  return {
    key: toolKey || null,
    ability: toolData?.ability ?? null,
    proficiency: Number.isFinite(proficiencyValue) ? proficiencyValue : null,
    total: Number.isFinite(total) ? total : null,
    tier: getToolProficiencyTier(total),
  };
}

function getToolProficiencyTier(total) {
  if (!Number.isFinite(total)) return "unknown";
  if (total <= 2) return "novice";
  if (total <= 6) return "trained";
  if (total <= 10) return "expert";
  return "master";
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

async function requestMonsterLoot({ actor, apiKey }) {
  const systemPrompt = [
    "You are a D&D5e (2024) Dungeon Master assistant helping create creature loot tables.",
    "Return ONLY valid JSON, no markdown.",
    "The JSON object must contain these keys: loot (array), rationale (string).",
    "- loot: array of 3-6 items the creature might drop when defeated.",
    "- Each loot item must have: name (string), type (one of: material|weapon|equipment|consumable|tool|treasure), quantity (number >= 1), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number) and denomination (one of: cp|sp|ep|gp|pp)).",
    "- Do NOT include any item whose name matches an item in the creature's existingInventory.",
    "- rationale: brief 1-2 sentence explanation of why these items fit this creature.",
    "Focus on items appropriate to the creature's nature, habitat, and CR.",
    "Prefer mundane items for low-CR creatures; magic items are only appropriate at higher CRs.",
    "Do not include commentary outside the JSON.",
  ].join("\n");

  const userPrompt = [
    "Generate loot drop items for this creature. Do NOT suggest any items already in its existingInventory.",
    "Creature snapshot:",
    JSON.stringify(getLootGenerationSnapshot(actor), null, 2),
  ].join("\n\n");

  const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not parse into an object");
  }

  const loot = Array.isArray(parsed.loot) ? parsed.loot : [];
  const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

  return { loot, rationale };
}

async function requestJournalItems({ snapshot, actorSnapshot, apiKey }) {
  const systemPrompt = [
    "You are a D&D5e (2024) Dungeon Master assistant helping generate location-based items from journal notes.",
    "Return ONLY valid JSON, no markdown.",
    "The JSON object must contain these keys: items (array), rationale (string).",
    "- items: array of 3-8 items inspired by the journal's location and details.",
    "- Each item must have: name (string), type (one of: material|weapon|equipment|consumable|tool|treasure), quantity (number >= 1), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number >= 0) and denomination (one of: cp|sp|ep|gp|pp)).",
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
  ].join("\n\n");

  const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not parse into an object");
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

  return { items, rationale };
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

function resolveJournalEntry(sourceDocument) {
  if (!sourceDocument) return null;
  if (sourceDocument.documentName === "JournalEntry") return sourceDocument;
  if (sourceDocument.documentName === "JournalEntryPage") {
    return sourceDocument.parent ?? sourceDocument.journal ?? null;
  }

  return null;
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

function showLootGenerationDialog(actor, result) {
  const sanitizedLoot = sanitizeGeneratedInventoryItems(result.loot);

  const rationale = foundry.utils.escapeHTML(result.rationale || "");

  const tableHtml = buildGeneratedItemTable(sanitizedLoot, `${MODULE_ID}.lootDialog.noItems`);
  const buttons = {
    close: {
      label: game.i18n.localize("Close"),
    },
  };

  if (sanitizedLoot.length > 0) {
    buttons.add = {
      label: game.i18n.localize(`${MODULE_ID}.lootDialog.addToInventory`),
      callback: () => addLootToActorInventory(actor, sanitizedLoot),
    };
  }

  const dialog = new Dialog({
    title: game.i18n.format(`${MODULE_ID}.lootDialog.title`, {
      name: foundry.utils.escapeHTML(actor.name ?? ""),
    }),
    content: `
      <div class="feature-creep-loot-result">
        ${tableHtml}
        ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
      </div>`,
    buttons,
    default: sanitizedLoot.length > 0 ? "add" : "close",
  });

  dialog.render(true);
}

function showJournalItemsDialog(sourceDocument, result) {
  const journal = resolveJournalEntry(sourceDocument);
  if (!journal) return;

  const sanitizedItems = sanitizeGeneratedInventoryItems(result.items);
  const rationale = foundry.utils.escapeHTML(result.rationale || "");

  const tableHtml = buildGeneratedItemTable(sanitizedItems, `${MODULE_ID}.journalDialog.noItems`);
  const buttons = {
    close: {
      label: game.i18n.localize("Close"),
    },
  };

  if (sanitizedItems.length > 0) {
    buttons.create = {
      label: game.i18n.localize(`${MODULE_ID}.journalDialog.createItems`),
      callback: () => createWorldItemsFromJournal(journal, sanitizedItems),
    };
  }

  const dialog = new Dialog({
    title: game.i18n.format(`${MODULE_ID}.journalDialog.title`, {
      name: foundry.utils.escapeHTML(journal.name ?? ""),
    }),
    content: `
      <div class="feature-creep-loot-result">
        ${tableHtml}
        ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
      </div>`,
    buttons,
    default: sanitizedItems.length > 0 ? "create" : "close",
  });

  dialog.render(true);
}

async function createWorldItemsFromJournal(journal, items) {
  if (!Array.isArray(items) || items.length === 0) return;

  const generatedAt = Date.now();
  const createData = items.map((item) => ({
    name: item.name,
    type: item.type,
    system: {
      description: {
        value: item.description ? `<p>${item.description}</p>` : "",
      },
      quantity: item.quantity,
      weight: {
        value: item.weightValue,
        units: item.weightUnits,
      },
      price: {
        value: item.priceValue,
        denomination: item.priceDenom,
      },
    },
    flags: {
      [MODULE_ID]: {
        generatedJournalItem: true,
        generatedAt,
        sourceJournalUuid: journal.uuid,
      },
    },
  }));

  await Item.create(createData);

  ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.journalItemsCreated`, {
    count: items.length,
    name: journal.name,
  }));
}

function showCraftedItemsDialog(actor, artisanTool, ingredientResources, result) {
  const craftedItems = sanitizeGeneratedInventoryItems(result.items, { includeCraftingDc: true });
  const rationale = foundry.utils.escapeHTML(result.rationale || "");
  const ingredientNames = ingredientResources
    .map((resource) => `${resource.quantity}x ${foundry.utils.escapeHTML(resource.item.name)}`)
    .join(", ");
  const tableHtml = buildGeneratedItemTable(craftedItems, `${MODULE_ID}.craftDialog.noItems`, {
    showCraftingDc: true,
  });

  const buttons = {
    close: {
      label: game.i18n.localize("Close"),
    },
  };

  if (craftedItems.length > 0) {
    buttons.add = {
      label: game.i18n.localize(`${MODULE_ID}.craftDialog.addToInventory`),
      callback: () => addCraftedItemsToActorInventory(actor, craftedItems),
    };

    if (isBeaversCraftingIntegrationAvailable()) {
      buttons.recipe = {
        label: game.i18n.localize(`${MODULE_ID}.craftDialog.createRecipes`),
        callback: () => createBeaversRecipesFromCrafting(actor, artisanTool, ingredientResources, craftedItems, result),
      };
    }
  }

  const dialog = new Dialog({
    title: game.i18n.format(`${MODULE_ID}.craftDialog.resultsTitle`, {
      name: foundry.utils.escapeHTML(actor.name ?? ""),
    }),
    content: `
      <div class="feature-creep-generated-result">
        <p class="feature-creep-generated-summary">${game.i18n.format(`${MODULE_ID}.craftDialog.summary`, {
          tool: foundry.utils.escapeHTML(artisanTool.name ?? ""),
          count: ingredientResources.length,
        })}</p>
        <p class="feature-creep-generated-inputs"><strong>${game.i18n.localize(`${MODULE_ID}.craftDialog.ingredientsLabel`)}</strong>: ${ingredientNames}</p>
        ${tableHtml}
        ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
      </div>
    `,
    buttons,
    default: craftedItems.length > 0 ? "add" : "close",
  });

  dialog.render(true);
}

async function createBeaversRecipesFromCrafting(actor, toolItem, ingredientResources, craftedItems, result) {
  try {
    if (!isBeaversCraftingIntegrationAvailable()) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.recipeIntegrationMissing`));
      return;
    }

    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.notifications.creatingRecipes`));

    const outputTemplateItems = await createCraftingOutputTemplateItems(craftedItems);
    const toolUuid = await resolveToolUuidForBeaversTest(toolItem);
    const recipeItems = [];

    for (let index = 0; index < craftedItems.length; index++) {
      const crafted = craftedItems[index];
      const outputItem = outputTemplateItems[index];
      if (!outputItem) continue;

      const recipeData = await buildBeaversRecipeItemData({
        toolItem,
        toolUuid,
        ingredientResources,
        craftedItem: crafted,
        outputItem,
        rationale: String(result?.rationale || "").trim(),
      });

      const recipeItem = await Item.create(recipeData);
      if (recipeItem) recipeItems.push(recipeItem);
    }

    if (recipeItems.length === 0) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.recipeCreateNone`));
      return;
    }

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.recipeCreated`, {
      count: recipeItems.length,
    }));
  } catch (error) {
    console.error(`${MODULE_ID} | beavers recipe creation failed`, error);
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.recipeCreateFailed`));
  }
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

async function createCraftingOutputTemplateItems(craftedItems) {
  const createData = craftedItems.map((item) => ({
    name: item.name,
    type: item.type,
    system: {
      description: {
        value: item.description
          ? `<p>${item.description}</p><p><strong>Craft DC:</strong> ${item.craftingDc}</p>`
          : `<p><strong>Craft DC:</strong> ${item.craftingDc}</p>`,
      },
      quantity: item.quantity,
      weight: {
        value: item.weightValue,
        units: item.weightUnits,
      },
      price: {
        value: item.priceValue,
        denomination: item.priceDenom,
      },
    },
    flags: {
      [MODULE_ID]: {
        generatedCraftTemplate: true,
        craftingDc: item.craftingDc,
        generatedAt: Date.now(),
      },
    },
  }));

  return Item.create(createData);
}

async function buildBeaversRecipeItemData({ toolItem, toolUuid, ingredientResources, craftedItem, outputItem, rationale }) {
  const bsi = globalThis.beaversSystemInterface;
  const recipeItemType = bsi?.configLootItemType || "loot";
  const outputComponent = bsi.componentFromEntity(outputItem);
  outputComponent.quantity = craftedItem.quantity;

  let requiredToolEntity = toolItem;
  if (toolUuid) {
    try {
      const resolved = await fromUuid(toolUuid);
      if (resolved) requiredToolEntity = resolved;
    } catch {
      requiredToolEntity = toolItem;
    }
  }
  const requiredToolComponent = bsi.componentFromEntity(requiredToolEntity);
  requiredToolComponent.quantity = 1;

  const inputComponents = ingredientResources.map((resource) => {
    const component = bsi.componentFromEntity(resource.item);
    component.quantity = resource.quantity;
    return component;
  });

  const inputGroup = {};
  for (const component of inputComponents) {
    inputGroup[foundry.utils.randomID()] = component;
  }

  const instruction = "";
  const proficiencyMacro = buildCraftedToolProficiencyMacro(craftedItem);

  return {
    name: `${craftedItem.name} (${game.i18n.localize(`${MODULE_ID}.craftDialog.recipeSuffix`)})`,
    type: recipeItemType,
    img: outputItem.img,
    flags: {
      "beavers-crafting": {
        subtype: "Recipe",
        recipe: {
          required: {
            1: {
              [foundry.utils.randomID()]: requiredToolComponent,
            },
          },
          input: {
            1: inputGroup,
          },
          output: {
            1: {
              [foundry.utils.randomID()]: outputComponent,
            },
          },
          instruction,
          macro: proficiencyMacro,
          beaversTests: {
            fails: 1,
            consume: true,
            ands: {
              1: {
                hits: 1,
                ors: {
                  1: {
                    type: "ToolTest",
                    data: {
                      tool: toolUuid,
                      dc: craftedItem.craftingDc,
                    },
                  },
                },
              },
            },
          },
        },
      },
      [MODULE_ID]: {
        generatedRecipe: true,
        generatedAt: Date.now(),
      },
    },
  };
}

async function resolveToolUuidForBeaversTest(toolItem) {
  const fallback = toolItem?.uuid;
  const bsaActive = game.modules?.get("bsa-dnd5e")?.active;
  if (!bsaActive) return fallback;

  const configured = game.settings?.get("bsa-dnd5e", "toolConfig");
  if (!Array.isArray(configured) || configured.length === 0) return fallback;

  const targetName = normalizeForLookup(toolItem?.name);
  if (!targetName) return fallback;

  for (const uuid of configured) {
    try {
      const doc = await fromUuid(uuid);
      if (!doc) continue;
      if (normalizeForLookup(doc.name) === targetName) {
        return uuid;
      }
    } catch {
      continue;
    }
  }

  return fallback;
}

function buildCraftedToolProficiencyMacro(craftedItem) {
  if (craftedItem?.type !== "tool") return "";

  const proficiency = getCraftedToolProficiencyInfo(craftedItem);
  if (!proficiency?.key) return "";

  const toolKey = JSON.stringify(proficiency.key);
  const toolAbility = JSON.stringify(proficiency.ability);
  const toolLabel = JSON.stringify(proficiency.label);

  return [
    `const toolKey = ${toolKey};`,
    `const toolAbility = ${toolAbility};`,
    `const toolLabel = ${toolLabel};`,
    "result._actorUpdate = result._actorUpdate || {};",
    "const existingValue = Number(actor?.system?.tools?.[toolKey]?.value ?? 0);",
    "// Register tool proficiency in system config if not already present",
    "if (CONFIG?.DND5E?.toolProficiencies && !CONFIG.DND5E.toolProficiencies[toolKey]) {",
    "  CONFIG.DND5E.toolProficiencies[toolKey] = toolLabel;",
    "}",
    "// Grant tool proficiency (value=0); proficiency bonus is auto-calculated from actor level",
    "result._actorUpdate[`system.tools.${toolKey}.value`] = Math.max(existingValue, 0);",
    "// Set ability modifier for this tool (used in check calculation)",
    "result._actorUpdate[`system.tools.${toolKey}.ability`] = toolAbility;",
    "result._actorUpdate[`system.tools.${toolKey}.label`] = toolLabel;",
    "if (actor?.system?.tools?.[toolKey]) {",
    "  actor.system.tools[toolKey].value = Math.max(existingValue, 1);",
    "}",
    "return result;",
  ].join("\n");
}

async function addLootToActorInventory(actor, lootItems) {
  await addGeneratedItemsToActorInventory(actor, lootItems, "generatedLoot", `${MODULE_ID}.notifications.lootAdded`);
}

async function addCraftedItemsToActorInventory(actor, craftedItems) {
  await addGeneratedItemsToActorInventory(actor, craftedItems, "generatedCraft", `${MODULE_ID}.notifications.craftAdded`);
}

function getCraftedToolProficiencyInfo(craftedItem) {
  const label = String(craftedItem?.name || "Crafted Tool").trim();
  const key = normalizeToolProficiencyKey(craftedItem?.toolKey || label);
  if (!key) return null;

  return {
    key,
    ability: String(craftedItem?.toolAbility || "int").trim().toLowerCase() || "int",
    label,
  };
}

function normalizeToolProficiencyKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function getDefaultWeightUnit() {
  const configuredUnits = CONFIG?.weightUnits;
  if (configuredUnits && typeof configuredUnits === "object") {
    if (Object.hasOwn(configuredUnits, "lb")) return "lb";
    if (Object.hasOwn(configuredUnits, "kg")) return "kg";

    const firstUnit = Object.keys(configuredUnits).find((key) => typeof key === "string" && key.trim());
    if (firstUnit) return firstUnit;
  }

  return "lb";
}

function sanitizeGeneratedInventoryItems(items, options = {}) {
  const VALID_DENOMS = new Set(["cp", "sp", "ep", "gp", "pp"]);
  const VALID_WEIGHT_UNITS = new Set(["lb", "kg"]);
  const defaultWeightUnit = getDefaultWeightUnit();
  const includeCraftingDc = options.includeCraftingDc === true;

  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object" && String(item.name || "").trim())
    .map((item) => {
      const normalized = {
        name: String(item.name || "").trim().slice(0, 100),
        type: normalizeGeneratedItemType(item.type),
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        description: String(item.description || "").trim().slice(0, 2000),
        weightValue: Math.max(0, Number(item.weight?.value) || 0),
        weightUnits: VALID_WEIGHT_UNITS.has(String(item.weight?.units || "").trim().toLowerCase())
          ? String(item.weight.units).trim().toLowerCase()
          : defaultWeightUnit,
        priceValue: Math.max(0, Number(item.price?.value) || 0),
        priceDenom: VALID_DENOMS.has(String(item.price?.denomination || "").trim().toLowerCase())
          ? String(item.price.denomination).trim().toLowerCase()
          : "gp",
      };

      if (includeCraftingDc) {
        normalized.type = coerceCraftingTypeFromItemText(item, normalized.type);
        normalized.craftingDc = Math.max(5, Math.min(30, Math.round(Number(item.craftingDc) || 10)));
      }

      return normalized;
    });
}

function normalizeGeneratedItemType(value) {
  const normalized = normalizeForLookup(value);
  if (["loot", "weapon", "equipment", "consumable", "tool", "container"].includes(normalized)) return normalized;
  if (normalized === "material" || normalized === "treasure") return "loot";
  return "loot";
}

function coerceCraftingTypeFromItemText(item, normalizedType) {
  if (normalizedType === "tool") return "tool";

  const name = String(item?.name || "");
  const description = String(item?.description || "");
  const text = `${name} ${description}`.toLowerCase();

  const toolPattern = /\b(tool|toolkit|tool kit|kit|instrument|artisan'?s? tools?|implements?)\b/;
  const usePattern = /\b(used to|use to|used for|for crafting|for checks?)\b/;

  if (toolPattern.test(text) && usePattern.test(text)) {
    return "tool";
  }

  return normalizedType;
}

function buildGeneratedItemTable(items, emptyLabelKey, options = {}) {
  const showCraftingDc = options.showCraftingDc === true;

  if (!items.length) {
    return `<p>${game.i18n.localize(emptyLabelKey)}</p>`;
  }

  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${foundry.utils.escapeHTML(item.name)}</td>
        <td>${foundry.utils.escapeHTML(item.type)}</td>
        <td style="text-align:center">${item.quantity}</td>
        ${showCraftingDc ? `<td style="text-align:right">${item.craftingDc ?? "-"}</td>` : ""}
        <td style="text-align:right">${item.weightValue} ${foundry.utils.escapeHTML(item.weightUnits)}</td>
        <td style="text-align:right">${item.priceValue} ${foundry.utils.escapeHTML(item.priceDenom)}</td>
      </tr>`
    )
    .join("");

  return `
    <table class="feature-creep-loot-table">
      <thead>
        <tr>
          <th>${game.i18n.localize(`${MODULE_ID}.lootDialog.colName`)}</th>
          <th>${game.i18n.localize(`${MODULE_ID}.lootDialog.colType`)}</th>
          <th>${game.i18n.localize(`${MODULE_ID}.lootDialog.colQty`)}</th>
          ${showCraftingDc ? `<th>${game.i18n.localize(`${MODULE_ID}.craftDialog.colDc`)}</th>` : ""}
          <th>${game.i18n.localize(`${MODULE_ID}.lootDialog.colWeight`)}</th>
          <th>${game.i18n.localize(`${MODULE_ID}.lootDialog.colPrice`)}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

async function addGeneratedItemsToActorInventory(actor, items, flagKey, notificationKey) {
  if (!items.length) return;

  const generatedAt = Date.now();
  const createData = items.map((item) => ({
    name: item.name,
    type: item.type,
    system: {
      description: {
        value: item.description
          ? `<p>${item.description}</p>${Number.isFinite(Number(item.craftingDc)) ? `<p><strong>${game.i18n.localize(`${MODULE_ID}.craftDialog.colDc`)}:</strong> ${Math.round(Number(item.craftingDc))}</p>` : ""}`
          : Number.isFinite(Number(item.craftingDc))
            ? `<p><strong>${game.i18n.localize(`${MODULE_ID}.craftDialog.colDc`)}:</strong> ${Math.round(Number(item.craftingDc))}</p>`
            : "",
      },
      quantity: item.quantity,
      weight: {
        value: item.weightValue,
        units: item.weightUnits,
      },
      price: {
        value: item.priceValue,
        denomination: item.priceDenom,
      },
    },
    flags: {
      [MODULE_ID]: {
        [flagKey]: true,
        generatedAt,
        ...(Number.isFinite(Number(item.craftingDc)) ? { craftingDc: Math.round(Number(item.craftingDc)) } : {}),
      },
    },
  }));

  await actor.createEmbeddedDocuments("Item", createData);

  ui.notifications.info(game.i18n.format(notificationKey, {
    count: items.length,
    name: actor.name,
  }));
}

function isCraftingTool(item) {
  return item?.type === "tool";
}

function getActorCraftingTools(actor) {
  return actor.items
    .filter((item) => isCraftingTool(item))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getActorCraftingIngredientItems(actor) {
  const supportedTypes = new Set(["loot", "weapon", "equipment", "consumable", "tool", "container"]);

  return actor.items
    .filter((item) => supportedTypes.has(item.type))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function formatCraftingIngredientLabel(item) {
  const available = getItemAvailableQuantity(item);
  return `${item.name} (${item.type}, ${game.i18n.localize(`${MODULE_ID}.craftDialog.availableLabel`)}: ${available})`;
}

function getItemAvailableQuantity(item) {
  const value = Number(item?.system?.quantity);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.floor(value));
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
    ui.notifications.error(game.i18n.localize(`${MODULE_ID}.notifications.invalidResponse`));
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

async function requestAnthropicJson({ systemPrompt, userPrompt, apiKey }) {
  const model = game.settings.get(MODULE_ID, "model");
  const maxTokens = Number(game.settings.get(MODULE_ID, "maxTokens")) || 3000;
  const configuredEndpoint = String(game.settings.get(MODULE_ID, "requestEndpoint") || "").trim();
  const requestEndpoint = configuredEndpoint || ANTHROPIC_ENDPOINT;
  const relayAuthHeader = String(game.settings.get(MODULE_ID, "relayAuthHeader") || "").trim();

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
  return parsed;
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

async function applyMonsterRebalance(actor, payload, targetCr) {
  const actorUpdates = sanitizeActorRebalanceUpdates(actor, payload?.actorUpdates, targetCr);
  if (Object.keys(actorUpdates).length > 0) {
    await actor.update(actorUpdates);
  }

  const itemUpdates = sanitizeMonsterItemUpdates(actor, payload?.itemUpdates);
  for (const itemUpdate of itemUpdates) {
    const item = actor.items.get(itemUpdate.id);
    if (!item) continue;
    await item.update(itemUpdate.updates);
  }
}

function sanitizeActorRebalanceUpdates(actor, rawUpdates, targetCr) {
  const updates = {};
  const source = rawUpdates && typeof rawUpdates === "object" ? rawUpdates : {};

  for (const [path, value] of Object.entries(source)) {
    if (!isAllowedActorRebalancePath(path)) continue;
    updates[path] = value;
  }

  updates["system.details.cr"] = targetCr;

  const hpMax = Number(updates["system.attributes.hp.max"]);
  if (Number.isFinite(hpMax) && hpMax > 0 && updates["system.attributes.hp.value"] === undefined) {
    updates["system.attributes.hp.value"] = scaleHpValue(actor, hpMax);
  }

  const acFlat = Number(updates["system.attributes.ac.flat"]);
  if (Number.isFinite(acFlat) && !String(updates["system.attributes.ac.calc"] ?? "").trim()) {
    updates["system.attributes.ac.calc"] = actor.system?.attributes?.ac?.calc === "flat" ? "flat" : "natural";
  }

  return updates;
}

function sanitizeMonsterItemUpdates(actor, rawItemUpdates) {
  if (!Array.isArray(rawItemUpdates)) return [];

  const sanitized = [];

  for (const entry of rawItemUpdates) {
    if (!entry || typeof entry !== "object") continue;

    const item = resolveActorItem(actor, entry);
    if (!item) continue;

    const source = entry.updates && typeof entry.updates === "object" ? entry.updates : {};
    const updates = {};

    for (const [path, value] of Object.entries(source)) {
      if (!isAllowedItemRebalancePath(path)) continue;
      updates[path] = value;
    }

    applyLegacyMonsterItemUpdateTranslations(item, updates);

    if (Object.keys(updates).length === 0) continue;
    sanitized.push({ id: item.id, updates });
  }

  return sanitized;
}

function isAllowedActorRebalancePath(path) {
  if (typeof path !== "string" || !path.startsWith("system.")) return false;

  const blockedPrefixes = [
    "system.details.biography",
    "system.details.notes",
    "system.details.appearance",
    "system.attributes.attunement",
  ];

  return !blockedPrefixes.some((prefix) => path.startsWith(prefix));
}

function isAllowedItemRebalancePath(path) {
  if (path === "name") return true;
  if (typeof path !== "string") return false;
  if (!path.startsWith("system.") && !path.startsWith("flags.")) return false;

  const blockedPrefixes = [
    "flags.core",
  ];

  return !blockedPrefixes.some((prefix) => path.startsWith(prefix));
}

function applyLegacyMonsterItemUpdateTranslations(item, updates) {
  if (!updates || typeof updates !== "object") return;

  translateAttackBonusUpdates(item, updates);
  translateDamagePartUpdates(item, updates);
  translateSaveDcUpdates(item, updates);
}

function translateAttackBonusUpdates(item, updates) {
  if (updates["system.attack.bonus"] === undefined) return;

  const attackActivities = getItemActivitiesByType(item, "attack");
  for (const activity of attackActivities) {
    updates[`system.activities.${activity.id}.attack.bonus`] = updates["system.attack.bonus"];
    if (updates[`system.activities.${activity.id}.attack.flat`] === undefined) {
      updates[`system.activities.${activity.id}.attack.flat`] = true;
    }
  }
}

function translateDamagePartUpdates(item, updates) {
  if (updates["system.damage.parts"] === undefined) return;

  const damageParts = updates["system.damage.parts"];
  const targetActivities = item.system?.activities?.filter((activity) => Array.isArray(activity.damage?.parts) && activity.damage.parts.length) ?? [];

  for (const activity of targetActivities) {
    updates[`system.activities.${activity.id}.damage.parts`] = damageParts;
  }
}

function translateSaveDcUpdates(item, updates) {
  const saveDc = updates["system.save.dc.formula"] ?? updates["system.save.dc"];
  if (saveDc === undefined) return;

  const saveActivities = getItemActivitiesByType(item, "save");
  for (const activity of saveActivities) {
    updates[`system.activities.${activity.id}.save.dc.formula`] = saveDc;
    if (updates[`system.activities.${activity.id}.save.dc.calculation`] === undefined) {
      updates[`system.activities.${activity.id}.save.dc.calculation`] = "";
    }
  }
}

function getItemActivitiesByType(item, type) {
  return item.system?.activities?.getByType?.(type) ?? [];
}

function resolveActorItem(actor, itemUpdate) {
  const explicitId = String(itemUpdate.id || "").trim();
  if (explicitId) return actor.items.get(explicitId) ?? null;

  const name = normalizeForLookup(itemUpdate.name);
  const type = String(itemUpdate.type || "").trim().toLowerCase();
  if (!name) return null;

  return actor.items.find((item) => {
    if (normalizeForLookup(item.name) !== name) return false;
    if (!type) return true;
    return String(item.type || "").trim().toLowerCase() === type;
  }) ?? null;
}

function scaleHpValue(actor, newMaxHp) {
  const currentValue = Number(actor.system?.attributes?.hp?.value ?? 0);
  const currentMax = Number(actor.system?.attributes?.hp?.max ?? 0);
  if (!Number.isFinite(currentValue) || currentValue < 0) return newMaxHp;
  if (currentValue === 0) return 0;
  if (!Number.isFinite(currentMax) || currentMax <= 0) return newMaxHp;
  if (currentValue >= currentMax) return newMaxHp;

  return Math.max(1, Math.round((currentValue / currentMax) * newMaxHp));
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

function showCrGuessResultDialog(actor, result) {
  const estimatedCr = formatChallengeRating(result.estimatedCr) || "?";
  const currentCr = formatChallengeRating(actor.system?.details?.cr) || game.i18n.localize("Unknown");
  const confidence = game.i18n.localize(`${MODULE_ID}.confidence.${result.confidence}`);
  const rationale = foundry.utils.escapeHTML(result.rationale || game.i18n.localize(`${MODULE_ID}.guessCr.noRationale`));

  ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.guessCrSuccess`, {
    cr: estimatedCr,
  }));

  const dialog = new Dialog({
    title: game.i18n.localize(`${MODULE_ID}.guessCrDialog.title`),
    content: `
      <div class="feature-creep-guess-cr-result">
        <p>${game.i18n.format(`${MODULE_ID}.guessCrDialog.summary`, {
          name: foundry.utils.escapeHTML(actor.name ?? ""),
          estimatedCr,
          confidence,
          currentCr,
        })}</p>
        <p><strong>${game.i18n.localize(`${MODULE_ID}.guessCrDialog.rationaleLabel`)}</strong></p>
        <p>${rationale}</p>
      </div>
    `,
    buttons: {
      ok: {
        label: game.i18n.localize("OK"),
      },
    },
    default: "ok",
  });

  dialog.render(true);
}

function normalizeForLookup(value) {
  return String(value ?? "").trim().toLowerCase();
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

async function applyFameosityPricingToMerchant(npcActor, merchantData) {
  try {
    const config = getShopPricingConfig();
    if (!config.enabled) return { applied: false, count: 0 };

    const fameosityApi = getFameosityApi();
    if (!fameosityApi) return { applied: false, count: 0 };
    if (typeof game.itempiles?.API?.updateMerchantPriceModifiers !== "function") return { applied: false, count: 0 };

    const playerCharacters = getFameosityPlayerCharacters(fameosityApi);
    if (playerCharacters.length === 0) return { applied: false, count: 0 };

    const npcTendency = getFameosityNpcTendency(fameosityApi, npcActor.id);
    const baseBuy = clampShopModifier(merchantData?.buyPriceModifier, 1);
    const baseSell = clampShopModifier(merchantData?.sellPriceModifier, 0.5);

    const modifierData = [];

    for (const pc of playerCharacters) {
      const relation = getFameosityNpcRelationToPc(fameosityApi, npcActor.id, pc.id);
      const reputationScore = computeWeightedReputationScore(relation, npcTendency, config);
      const pricing = computeReputationPriceModifiers(baseBuy, baseSell, reputationScore, config);

      modifierData.push({
        actor: pc,
        buyPriceModifier: pricing.buyPriceModifier,
        sellPriceModifier: pricing.sellPriceModifier,
        override: true,
        relative: false,
      });
    }

    if (modifierData.length === 0) return { applied: false, count: 0 };

    await game.itempiles.API.updateMerchantPriceModifiers(npcActor, modifierData);

    return {
      applied: true,
      count: modifierData.length,
    };
  } catch (error) {
    console.warn(`${MODULE_ID} | fameosity pricing integration failed`, error);
    return { applied: false, count: 0 };
  }
}

function getFameosityApi() {
  const moduleApi = game.modules?.get("fameosity")?.api;
  if (moduleApi) return moduleApi;

  const legacyApi = globalThis.SweetyUtilities;
  if (legacyApi && typeof legacyApi === "object") return legacyApi;

  return null;
}

function getFameosityPlayerCharacters(fameosityApi) {
  if (typeof fameosityApi.getPCs === "function") {
    const pcs = fameosityApi.getPCs();
    if (Array.isArray(pcs) && pcs.length > 0) return pcs;
  }

  return Array.from(game.actors ?? []).filter((actor) => actor?.type === "character" && actor?.hasPlayerOwner);
}

function getFameosityNpcTendency(fameosityApi, npcId) {
  let tendency = 0;

  if (typeof fameosityApi.getEffectiveActorRep === "function") {
    tendency = Number(fameosityApi.getEffectiveActorRep(npcId) ?? 0);
  } else if (typeof fameosityApi.getActorRep === "function") {
    tendency = Number(fameosityApi.getActorRep(npcId) ?? 0);
  }

  return clampReputationScore(tendency);
}

function getFameosityNpcRelationToPc(fameosityApi, npcId, pcId) {
  if (typeof fameosityApi.getIndRel !== "function") return 0;

  return clampReputationScore(Number(fameosityApi.getIndRel(npcId, pcId) ?? 0));
}

function clampReputationScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-100, Math.min(100, numeric));
}

function getShopPricingConfig() {
  const enabled = game.settings.get(MODULE_ID, "shopUseFameosityPricing") !== false;

  const relationWeight = Math.max(0, Number(game.settings.get(MODULE_ID, "shopPricingRelationWeight")) || 0);
  const tendencyWeight = Math.max(0, Number(game.settings.get(MODULE_ID, "shopPricingTendencyWeight")) || 0);

  const buyImpact = Math.max(0, Math.min(1, Number(game.settings.get(MODULE_ID, "shopPricingBuyImpact")) || 0));
  const sellImpact = Math.max(0, Math.min(1, Number(game.settings.get(MODULE_ID, "shopPricingSellImpact")) || 0));

  return {
    enabled,
    relationWeight,
    tendencyWeight,
    buyImpact,
    sellImpact,
  };
}

function computeWeightedReputationScore(relation, tendency, config) {
  const relationWeight = Math.max(0, Number(config?.relationWeight) || 0);
  const tendencyWeight = Math.max(0, Number(config?.tendencyWeight) || 0);
  const total = relationWeight + tendencyWeight;

  if (total <= 0) {
    return clampReputationScore(Math.round((clampReputationScore(relation) * 0.75) + (clampReputationScore(tendency) * 0.25)));
  }

  const weighted = ((clampReputationScore(relation) * relationWeight) + (clampReputationScore(tendency) * tendencyWeight)) / total;
  return clampReputationScore(Math.round(weighted));
}

function computeReputationPriceModifiers(baseBuy, baseSell, reputationScore, config = {}) {
  const normalized = clampReputationScore(reputationScore) / 100;

  const buyImpact = Math.max(0, Math.min(1, Number(config.buyImpact) || 0));
  const sellImpact = Math.max(0, Math.min(1, Number(config.sellImpact) || 0));

  const buyShift = buyImpact * normalized;
  const sellShift = sellImpact * normalized;

  const buyPriceModifier = roundPriceModifier(Math.max(0.05, baseBuy * (1 - buyShift)), baseBuy);
  const sellPriceModifier = roundPriceModifier(Math.max(0.05, baseSell * (1 + sellShift)), baseSell);

  const adjusted = normalizeMerchantPriceSpread(buyPriceModifier, sellPriceModifier);

  return {
    buyPriceModifier: adjusted.buyPriceModifier,
    sellPriceModifier: adjusted.sellPriceModifier,
  };
}

function roundPriceModifier(value, fallback) {
  const rounded = Math.round(Number(value) * 100) / 100;
  return clampShopModifier(rounded, fallback);
}

function normalizeMerchantPriceSpread(buyPriceModifier, sellPriceModifier) {
  const buy = Math.max(0.05, clampShopModifier(buyPriceModifier, 1));
  const sell = Math.max(0.05, clampShopModifier(sellPriceModifier, 0.5));

  const minSpread = 0.05;
  if (sell <= buy - minSpread) {
    return {
      buyPriceModifier: roundPriceModifier(buy, 1),
      sellPriceModifier: roundPriceModifier(sell, 0.5),
    };
  }

  const adjustedSell = Math.max(0.05, buy - minSpread);
  return {
    buyPriceModifier: roundPriceModifier(buy, 1),
    sellPriceModifier: roundPriceModifier(adjustedSell, 0.5),
  };
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
