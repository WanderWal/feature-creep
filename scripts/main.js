import { registerModuleSettings, registerIconIndexAgentMenu } from "./settings.js";
import { createAnthropicJsonRequester } from "./anthropic-client.js";
import { notifyAiRequestFailure } from "./ai-error-handler.js";
import { createAiHelpers } from "./ai-helpers.js";
import { createAiRequests } from "./ai-requests.js";
import { createApplyHelpers } from "./apply-helpers.js";
import { createFameosityPricing } from "./fameosity-pricing.js";
import { createApplyActions } from "./apply-actions.js";
import { createUiDialogs } from "./ui-dialogs.js";
import { createUiPrompts } from "./ui-prompts.js";
import { createIconIndexAgent } from "./icon-library.js";
import { createIconIndexAgentMenuClass } from "./icon-index-menu.js";
import { createAnthropicOrchestrator } from "./orchestration.js";
import {
  canUseModule,
  isDnd5eItemSheet,
  isDnd5eNpcSheet,
  isDnd5eCraftingActorSheet,
  isJournalSheet,
} from "./sheet-guards.js";

const MODULE_ID = "feature-creep";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ACTIVE_GENERATION_LOCKS = new Set();
const requestAnthropicJson = createAnthropicJsonRequester({
  moduleId: MODULE_ID,
  defaultEndpoint: ANTHROPIC_ENDPOINT,
});
const iconIndexAgent = createIconIndexAgent({
  moduleId: MODULE_ID,
});
const aiHelpers = createAiHelpers({
  helpers: {
    htmlToText,
    resolveJournalEntry,
    normalizeGeneratedItemType,
    getDefaultWeightUnit,
  },
});
const aiRequests = createAiRequests({
  moduleId: MODULE_ID,
  requestAnthropicJson,
  helpers: {
    getJournalGenerationSnapshot: aiHelpers.getJournalGenerationSnapshot,
    summarizeActorForJournalItems: aiHelpers.summarizeActorForJournalItems,
    getCharacterShopGenerationSnapshot: aiHelpers.getCharacterShopGenerationSnapshot,
    normalizeShopCompendiumSelections: aiHelpers.normalizeShopCompendiumSelections,
    buildShopStockFromCompendiumSelections: aiHelpers.buildShopStockFromCompendiumSelections,
    isBeaversCraftingIntegrationAvailable: aiHelpers.isBeaversCraftingIntegrationAvailable,
    getCraftingGenerationSnapshot: aiHelpers.getCraftingGenerationSnapshot,
    getLootGenerationSnapshot: aiHelpers.getLootGenerationSnapshot,
    formatChallengeRating: aiHelpers.formatChallengeRating,
    getMonsterRebalanceSnapshot: aiHelpers.getMonsterRebalanceSnapshot,
    getMonsterCrGuessSnapshot: aiHelpers.getMonsterCrGuessSnapshot,
    parseChallengeRating: aiHelpers.parseChallengeRating,
    normalizeCrGuessConfidence: aiHelpers.normalizeCrGuessConfidence,
    enhancePayloadForKnownPatterns: aiHelpers.enhancePayloadForKnownPatterns,
    getIconPromptContext: iconIndexAgent.getIconPromptContext,
  },
});

const anthropicOrchestrator = createAnthropicOrchestrator({
  moduleId: MODULE_ID,
  requestAnthropicJson,
  helpers: {
    getCraftingGenerationSnapshot: aiHelpers.getCraftingGenerationSnapshot,
    getLootGenerationSnapshot: aiHelpers.getLootGenerationSnapshot,
    getIconPromptContext: iconIndexAgent.getIconPromptContext,
  },
});

const IconIndexAgentMenu = createIconIndexAgentMenuClass({
  moduleId: MODULE_ID,
  iconIndexAgent,
});

const requestImproviseImpl = aiRequests.requestImprovise;
const requestCharacterShopSetupImpl = aiRequests.requestCharacterShopSetup;
const requestCraftedItemsImpl = aiRequests.requestCraftedItems;
const requestMonsterLootImpl = aiRequests.requestMonsterLoot;
const requestJournalItemsImpl = aiRequests.requestJournalItems;
const requestAnthropicGenerationImpl = aiRequests.requestAnthropicGeneration;
const requestMonsterRebalanceImpl = aiRequests.requestMonsterRebalance;
const requestMonsterCrGuessImpl = aiRequests.requestMonsterCrGuess;
const orchestrateLootGenerationImpl = anthropicOrchestrator.orchestrateLootGeneration;
const orchestrateCraftGenerationImpl = anthropicOrchestrator.orchestrateCraftGeneration;

const summarizeActorForJournalItemsImpl = aiHelpers.summarizeActorForJournalItems;
const getCharacterShopGenerationSnapshotImpl = aiHelpers.getCharacterShopGenerationSnapshot;
const normalizeShopCompendiumSelectionsImpl = aiHelpers.normalizeShopCompendiumSelections;
const buildShopStockFromCompendiumSelectionsImpl = aiHelpers.buildShopStockFromCompendiumSelections;
const getCraftingGenerationSnapshotImpl = aiHelpers.getCraftingGenerationSnapshot;
const getJournalGenerationSnapshotImpl = aiHelpers.getJournalGenerationSnapshot;
const getLootGenerationSnapshotImpl = aiHelpers.getLootGenerationSnapshot;
const isBeaversCraftingIntegrationAvailableImpl = aiHelpers.isBeaversCraftingIntegrationAvailable;
const enhancePayloadForKnownPatternsImpl = aiHelpers.enhancePayloadForKnownPatterns;
const getMonsterCrGuessSnapshotImpl = aiHelpers.getMonsterCrGuessSnapshot;
const getMonsterRebalanceSnapshotImpl = aiHelpers.getMonsterRebalanceSnapshot;
const parseChallengeRatingImpl = aiHelpers.parseChallengeRating;
const formatChallengeRatingImpl = aiHelpers.formatChallengeRating;
const normalizeCrGuessConfidenceImpl = aiHelpers.normalizeCrGuessConfidence;

const applyHelpers = createApplyHelpers({
  moduleId: MODULE_ID,
});

const clampShopModifierImpl = applyHelpers.clampShopModifier;
const normalizeAiMerchantModifiersImpl = applyHelpers.normalizeAiMerchantModifiers;
const getExistingShopDescriptionImpl = applyHelpers.getExistingShopDescription;
const addGeneratedItemsToActorInventoryImpl = applyHelpers.addGeneratedItemsToActorInventory;
const sanitizeActorRebalanceUpdatesImpl = applyHelpers.sanitizeActorRebalanceUpdates;
const sanitizeMonsterItemUpdatesImpl = applyHelpers.sanitizeMonsterItemUpdates;
const applyEffectsImpl = applyHelpers.applyEffects;
const applyItemMacroImpl = applyHelpers.applyItemMacro;
const roundPriceModifierImpl = applyHelpers.roundPriceModifier;
const normalizeMerchantPriceSpreadImpl = applyHelpers.normalizeMerchantPriceSpread;
const applyIntegrationFlagsImpl = applyHelpers.applyIntegrationFlags;
const normalizeMacroIntegrationImpl = applyHelpers.normalizeMacroIntegration;

const fameosityPricing = createFameosityPricing({
  moduleId: MODULE_ID,
  helpers: {
    clampShopModifier: applyHelpers.clampShopModifier,
    roundPriceModifier: applyHelpers.roundPriceModifier,
    normalizeMerchantPriceSpread: applyHelpers.normalizeMerchantPriceSpread,
  },
});

const applyFameosityPricingToMerchantImpl = fameosityPricing.applyFameosityPricingToMerchant;
const getFameosityApiImpl = fameosityPricing.getFameosityApi;
const getFameosityPlayerCharactersImpl = fameosityPricing.getFameosityPlayerCharacters;
const getFameosityNpcTendencyImpl = fameosityPricing.getFameosityNpcTendency;
const getFameosityNpcRelationToPcImpl = fameosityPricing.getFameosityNpcRelationToPc;
const clampReputationScoreImpl = fameosityPricing.clampReputationScore;
const getShopPricingConfigImpl = fameosityPricing.getShopPricingConfig;
const computeWeightedReputationScoreImpl = fameosityPricing.computeWeightedReputationScore;
const computeReputationPriceModifiersImpl = fameosityPricing.computeReputationPriceModifiers;

const applyActions = createApplyActions({
  moduleId: MODULE_ID,
  helpers: {
    isItemPilesShopIntegrationAvailable,
    isBeaversCraftingIntegrationAvailable,
    normalizeAiMerchantModifiers: applyHelpers.normalizeAiMerchantModifiers,
    getExistingShopDescription: applyHelpers.getExistingShopDescription,
    normalizeMerchantPriceSpread: applyHelpers.normalizeMerchantPriceSpread,
    applyFameosityPricingToMerchant: fameosityPricing.applyFameosityPricingToMerchant,
    addGeneratedItemsToActorInventory: applyHelpers.addGeneratedItemsToActorInventory,
    createCraftingOutputTemplateItems,
    resolveToolUuidForBeaversTest,
    buildBeaversRecipeItemData,
    toActivityMap,
    applyEffects: applyHelpers.applyEffects,
    applyItemMacro: applyHelpers.applyItemMacro,
    applyIntegrationFlags: applyHelpers.applyIntegrationFlags,
    normalizeMacroIntegration: applyHelpers.normalizeMacroIntegration,
    sanitizeActorRebalanceUpdates: applyHelpers.sanitizeActorRebalanceUpdates,
    sanitizeMonsterItemUpdates: applyHelpers.sanitizeMonsterItemUpdates,
  },
});

const applyCharacterShopToActorImpl = applyActions.applyCharacterShopToActor;
const createWorldItemsFromJournalImpl = applyActions.createWorldItemsFromJournal;
const createBeaversRecipesFromCraftingImpl = applyActions.createBeaversRecipesFromCrafting;
const addLootToActorInventoryImpl = applyActions.addLootToActorInventory;
const addCraftedItemsToActorInventoryImpl = applyActions.addCraftedItemsToActorInventory;
const applyPayloadToItemImpl = applyActions.applyPayloadToItem;
const applyMonsterRebalanceImpl = applyActions.applyMonsterRebalance;

const uiDialogs = createUiDialogs({
  moduleId: MODULE_ID,
  helpers: {
    resolveJournalEntry,
    sanitizeGeneratedInventoryItems,
    isBeaversCraftingIntegrationAvailable,
    formatChallengeRating,
  },
  actions: {
    applyCharacterShopToActor,
    addLootToActorInventory,
    createWorldItemsFromJournal,
    addCraftedItemsToActorInventory,
    createBeaversRecipesFromCrafting,
  },
});

const showImproviseResultDialogImpl = uiDialogs.showImproviseResultDialog;
const showCharacterShopDialogImpl = uiDialogs.showCharacterShopDialog;
const showLootGenerationDialogImpl = uiDialogs.showLootGenerationDialog;
const showJournalItemsDialogImpl = uiDialogs.showJournalItemsDialog;
const showCraftedItemsDialogImpl = uiDialogs.showCraftedItemsDialog;
const showCrGuessResultDialogImpl = uiDialogs.showCrGuessResultDialog;

const uiPrompts = createUiPrompts({
  moduleId: MODULE_ID,
  helpers: {
    getActorCraftingTools,
    getActorCraftingIngredientItems,
    formatCraftingIngredientLabel,
    getItemAvailableQuantity,
    isCraftingTool,
    formatChallengeRating,
    parseChallengeRating,
  },
});

const promptForTargetCrImpl = uiPrompts.promptForTargetCr;
const promptForCraftingSelectionImpl = uiPrompts.promptForCraftingSelection;
const promptForLootNotesImpl = uiPrompts.promptForLootNotes;
const promptForImproviseSelectionImpl = uiPrompts.promptForImproviseSelection;
const promptForJournalActorSelectionImpl = uiPrompts.promptForJournalActorSelection;

Hooks.once("init", () => {
  registerModuleSettings(MODULE_ID);
  registerIconIndexAgentMenu(MODULE_ID, IconIndexAgentMenu);
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
    module.api = {
      improvise: openImproviseDialog,
      iconIndexAgent: {
        indexNow: () => iconIndexAgent.indexAllIcons(),
        getMemory: () => iconIndexAgent.getMemorySnapshot(),
        getBestIcon: (item, type) => iconIndexAgent.askForBestIcon(item, type),
      },
    };
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
  return promptForTargetCrImpl(actor);
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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.failed`,
    });
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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.rebalanceFailed`,
    });
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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.guessCrFailed`,
    });
  }
}

async function generateCraftedItemsForActor(actor) {
  const lockKey = `craft:${actor?.id || "unknown"}`;
  if (ACTIVE_GENERATION_LOCKS.has(lockKey)) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.operationInProgress`));
    return;
  }

  ACTIVE_GENERATION_LOCKS.add(lockKey);

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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.craftFailed`,
    });
  } finally {
    ACTIVE_GENERATION_LOCKS.delete(lockKey);
  }
}

async function promptForCraftingSelection(actor) {
  return promptForCraftingSelectionImpl(actor);
}

async function promptForLootNotes(actor) {
  return promptForLootNotesImpl(actor);
}

async function generateLootForActor(actor) {
  const lockKey = `loot:${actor?.id || "unknown"}`;
  if (ACTIVE_GENERATION_LOCKS.has(lockKey)) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.notifications.operationInProgress`));
    return;
  }

  ACTIVE_GENERATION_LOCKS.add(lockKey);

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

    const lootNotes = await promptForLootNotes(actor);
    if (lootNotes === null) return;

    ui.notifications.info(game.i18n.format(`${MODULE_ID}.notifications.generatingLoot`, {
      name: actor.name,
    }));

    const result = await requestMonsterLoot({ actor, notes: lootNotes, apiKey });

    showLootGenerationDialog(actor, result);
  } catch (error) {
    console.error(`${MODULE_ID} | loot generation failed`, error);
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.lootFailed`,
    });
  } finally {
    ACTIVE_GENERATION_LOCKS.delete(lockKey);
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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.journalItemsFailed`,
    });
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
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.shopFailed`,
    });
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

    // Pass prompt and selectedJournals to result dialog for journal saving
    showImproviseResultDialog(result, {
      prompt: selection.situation,
      selectedJournals: selection.selectedJournals,
    });
  } catch (error) {
    console.error(`${MODULE_ID} | improvise failed`, error);
    notifyAiRequestFailure({
      moduleId: MODULE_ID,
      error,
      fallbackNotificationKey: `${MODULE_ID}.notifications.improviseFailed`,
    });
  }
}

async function promptForImproviseSelection() {
  return promptForImproviseSelectionImpl();
}

async function requestImprovise({ situation, selectedJournals, selectedActors, apiKey }) {
  return requestImproviseImpl({ situation, selectedJournals, selectedActors, apiKey });
}

function showImproviseResultDialog(result) {
  return showImproviseResultDialogImpl(result);
}

async function promptForJournalActorSelection() {
  return promptForJournalActorSelectionImpl();
}

function summarizeActorForJournalItems(actor) {
  return summarizeActorForJournalItemsImpl(actor);
}

async function requestCharacterShopSetup({ actor, apiKey, compendiumPack, compendiumCandidates }) {
  return requestCharacterShopSetupImpl({ actor, apiKey, compendiumPack, compendiumCandidates });
}

function getCharacterShopGenerationSnapshot(actor, compendiumPack, compendiumCandidates) {
  return getCharacterShopGenerationSnapshotImpl(actor, compendiumPack, compendiumCandidates);
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
  return normalizeShopCompendiumSelectionsImpl(selections, candidates);
}

async function buildShopStockFromCompendiumSelections(compendiumPack, selections) {
  return buildShopStockFromCompendiumSelectionsImpl(compendiumPack, selections);
}

function showCharacterShopDialog(actor, result) {
  return showCharacterShopDialogImpl(actor, result);
}

async function applyCharacterShopToActor(actor, result) {
  return applyCharacterShopToActorImpl(actor, result);
}

function clampShopModifier(value, fallback) {
  return clampShopModifierImpl(value, fallback);
}

function normalizeAiMerchantModifiers(merchant) {
  return normalizeAiMerchantModifiersImpl(merchant);
}

function getExistingShopDescription(actor) {
  return getExistingShopDescriptionImpl(actor);
}

function isItemPilesShopIntegrationAvailable() {
  const itemPiles = game.modules?.get("item-piles")?.active;
  const dnd5eBridge = game.modules?.get("itempilesdnd5e")?.active;
  const apiAvailable = Boolean(game.itempiles?.API);

  return Boolean(itemPiles && dnd5eBridge && apiAvailable);
}

async function requestCraftedItems({ artisanTool, toolProficiencyProfile, ingredientResources, notes, apiKey }) {
  if (game.settings.get(MODULE_ID, "anthropicOrchestrationEnabled")) {
    try {
      const orchestrated = await orchestrateCraftGenerationImpl({
        artisanTool,
        toolProficiencyProfile,
        ingredientResources,
        notes,
        apiKey,
      });

      if (orchestrated && typeof orchestrated === "object") {
        return orchestrated;
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | craft orchestration fallback to legacy`, error);
    }
  }

  return requestCraftedItemsImpl({ artisanTool, toolProficiencyProfile, ingredientResources, notes, apiKey });
}

function getCraftingGenerationSnapshot(artisanTool, toolProficiencyProfile, ingredientResources, notes) {
  return getCraftingGenerationSnapshotImpl(artisanTool, toolProficiencyProfile, ingredientResources, notes);
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

async function requestMonsterLoot({ actor, notes, apiKey }) {
  if (game.settings.get(MODULE_ID, "anthropicOrchestrationEnabled")) {
    try {
      const orchestrated = await orchestrateLootGenerationImpl({ actor, notes, apiKey });
      if (orchestrated && typeof orchestrated === "object") {
        return orchestrated;
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | loot orchestration fallback to legacy`, error);
    }
  }

  return requestMonsterLootImpl({ actor, notes, apiKey });
}

async function requestJournalItems({ snapshot, actorSnapshot, apiKey }) {
  return requestJournalItemsImpl({ snapshot, actorSnapshot, apiKey });
}

function getJournalGenerationSnapshot(sourceDocument) {
  return getJournalGenerationSnapshotImpl(sourceDocument);
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
  return getLootGenerationSnapshotImpl(actor);
}

function showLootGenerationDialog(actor, result) {
  return showLootGenerationDialogImpl(actor, result);
}

function showJournalItemsDialog(sourceDocument, result) {
  return showJournalItemsDialogImpl(sourceDocument, result);
}

async function createWorldItemsFromJournal(journal, items) {
  return createWorldItemsFromJournalImpl(journal, items);
}

function showCraftedItemsDialog(actor, artisanTool, ingredientResources, result) {
  return showCraftedItemsDialogImpl(actor, artisanTool, ingredientResources, result);
}

async function createBeaversRecipesFromCrafting(actor, toolItem, ingredientResources, craftedItems, result) {
  return createBeaversRecipesFromCraftingImpl(actor, toolItem, ingredientResources, craftedItems, result);
}

function isBeaversCraftingIntegrationAvailable() {
  return isBeaversCraftingIntegrationAvailableImpl();
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
  return addLootToActorInventoryImpl(actor, lootItems);
}

async function addCraftedItemsToActorInventory(actor, craftedItems) {
  return addCraftedItemsToActorInventoryImpl(actor, craftedItems);
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

      normalized.img = iconIndexAgent.getBestIconForItemFromCache(item, normalized.type);

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

async function addGeneratedItemsToActorInventory(actor, items, flagKey, notificationKey) {
  return addGeneratedItemsToActorInventoryImpl(actor, items, flagKey, notificationKey);
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
  return requestAnthropicGenerationImpl({ item, descriptionText, apiKey });
}

async function requestMonsterRebalance({ actor, targetCr, apiKey }) {
  return requestMonsterRebalanceImpl({ actor, targetCr, apiKey });
}

async function requestMonsterCrGuess({ actor, apiKey }) {
  return requestMonsterCrGuessImpl({ actor, apiKey });
}

function enhancePayloadForKnownPatterns({ payload, item, descriptionText }) {
  return enhancePayloadForKnownPatternsImpl({ payload, item, descriptionText });
}

async function applyPayloadToItem(item, payload) {
  return applyPayloadToItemImpl(item, payload);
}

async function applyMonsterRebalance(actor, payload, targetCr) {
  return applyMonsterRebalanceImpl(actor, payload, targetCr);
}

function sanitizeActorRebalanceUpdates(actor, rawUpdates, targetCr) {
  return sanitizeActorRebalanceUpdatesImpl(actor, rawUpdates, targetCr);
}

function sanitizeMonsterItemUpdates(actor, rawItemUpdates) {
  return sanitizeMonsterItemUpdatesImpl(actor, rawItemUpdates);
}

function getMonsterCrGuessSnapshot(actor) {
  return getMonsterCrGuessSnapshotImpl(actor);
}

function getMonsterRebalanceSnapshot(actor) {
  return getMonsterRebalanceSnapshotImpl(actor);
}

function parseChallengeRating(value) {
  return parseChallengeRatingImpl(value);
}

function formatChallengeRating(value) {
  return formatChallengeRatingImpl(value);
}

function normalizeCrGuessConfidence(value) {
  return normalizeCrGuessConfidenceImpl(value);
}

function showCrGuessResultDialog(actor, result) {
  return showCrGuessResultDialogImpl(actor, result);
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


function htmlToText(html) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent || element.innerText || "";
}
