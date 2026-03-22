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

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  injectLegacyActorHeaderButton(sheet, buttons);
  injectLegacyActorGuessButton(sheet, buttons);
  injectLegacyActorLootButton(sheet, buttons);
  injectLegacyActorCraftButton(sheet, buttons);
});

Hooks.on("getHeaderControlsItemSheet5e2", (sheet, buttons) => {
  injectV2HeaderControl(sheet, buttons);
});

Hooks.on("getHeaderControlsActorSheet5e2", (sheet, buttons) => {
  injectV2ActorHeaderControl(sheet, buttons);
  injectV2ActorGuessControl(sheet, buttons);
  injectV2ActorLootControl(sheet, buttons);
  injectV2ActorCraftControl(sheet, buttons);
});

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  injectV2HeaderControl(app, controls);
  injectV2ActorHeaderControl(app, controls);
  injectV2ActorGuessControl(app, controls);
  injectV2ActorLootControl(app, controls);
  injectV2ActorCraftControl(app, controls);
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

function isDnd5eCraftingActorSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  if (game.system?.id !== "dnd5e" || actor.documentName !== "Actor") return false;
  return actor.type === "character" || actor.type === "npc";
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
      actor,
      artisanTool: selection.artisanTool,
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

async function requestCraftedItems({ actor, artisanTool, ingredientResources, notes, apiKey }) {
  const recipeIntegrationActive = isBeaversCraftingIntegrationAvailable();

  const systemPrompt = [
    "You are a D&D5e (2024) crafting assistant for Foundry VTT used by a DM to build a crafting system.",
    "Return ONLY valid JSON, no markdown.",
    "The JSON object must contain these keys: items (array), rationale (string).",
    "- items: array of 1-4 crafted output items.",
    "- Each output item must have: name (string), type (one of: material|loot|weapon|equipment|consumable|tool|treasure), quantity (number >= 1), craftingDc (number), description (string), weight (object with value (number >= 0) and units (one of: lb|kg)), price (object with value (number >= 0) and denomination (one of: cp|sp|ep|gp|pp)).",
    "- The output items must plausibly be crafted using the selected tool and the provided ingredient resources with quantities.",
    "- Prefer transforming, refining, combining, or improving the provided ingredients rather than inventing unrelated treasure.",
    "- If the ingredients are not enough for a complete finished good, return sensible intermediate goods, components, or materials instead.",
    "- Do not include the selected tool itself as an output item.",
    "- Do not merely copy ingredient items unchanged unless a processed or improved version is justified.",
    "- If an output item is intended to be used as a crafting/check implement (kit, instrument, artisan tool, or utility tool), set its type to tool.",
    "- craftingDc must be a practical tool check DC in the 3-30 range and should scale with complexity and resource quality.",
    "- Take the selected tool check profile into account. If the tool check is strong, use lower or moderate DCs; if weak, use higher DCs for complex outputs.",
    recipeIntegrationActive
      ? "- These outputs will be turned into Beavers Crafting recipes by a DM tool, so each item should be a clear craft result with a meaningful, playable craftingDc and coherent required resources."
      : "",
    "- rationale: brief 1-3 sentence explanation of how the selected tool and ingredients support the crafted output.",
    "Do not include commentary outside the JSON.",
  ].filter(Boolean).join("\n");

  const userPrompt = [
    "Generate crafted output items based on this actor, selected tool, selected ingredient resources, and tool check profile.",
    "Crafting snapshot:",
    JSON.stringify(getCraftingGenerationSnapshot(actor, artisanTool, ingredientResources, notes), null, 2),
  ].join("\n\n");

  const parsed = await requestAnthropicJson({ systemPrompt, userPrompt, apiKey });

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not parse into an object");
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const rationale = String(parsed.rationale ?? "").trim().slice(0, 1200);

  return { items, rationale };
}

function getCraftingGenerationSnapshot(actor, artisanTool, ingredientResources, notes) {
  const system = actor.system ?? {};

  return {
    actor: {
      name: actor.name,
      type: actor.type,
      biography: htmlToText(system.details?.biography?.value ?? "").trim().slice(0, 1500),
    },
    tool: summarizeCraftingItem(artisanTool),
    toolCheck: getToolCheckProfile(actor, artisanTool),
    ingredientResources: ingredientResources.map((resource) => ({
      selectedQuantity: resource.quantity,
      availableQuantity: resource.available,
      item: summarizeCraftingItem(resource.item),
    })),
    notes: String(notes || "").trim() || null,
  };
}

function getToolCheckProfile(actor, toolItem) {
  const toolKey = String(toolItem?.system?.type?.baseItem || "").trim();
  const toolData = toolKey ? actor.system?.tools?.[toolKey] ?? null : null;
  const total = Number(toolData?.total);

  return {
    key: toolKey || null,
    ability: toolData?.ability ?? null,
    proficiency: toolData?.value ?? null,
    total: Number.isFinite(total) ? total : null,
  };
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
    "result._actorUpdate[`system.tools.${toolKey}.value`] = Math.max(existingValue, 1);",
    "if (!actor?.system?.tools?.[toolKey]?.ability) {",
    "  result._actorUpdate[`system.tools.${toolKey}.ability`] = toolAbility;",
    "}",
    "if (!actor?.system?.tools?.[toolKey]?.label) {",
    "  result._actorUpdate[`system.tools.${toolKey}.label`] = toolLabel;",
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
  if (["loot", "weapon", "equipment", "consumable", "tool"].includes(normalized)) return normalized;
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
  const supportedTypes = new Set(["loot", "weapon", "equipment", "consumable", "tool"]);

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
