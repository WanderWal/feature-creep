export function registerModuleSettings(moduleId) {
  game.settings.register(moduleId, "enabled", {
    name: `${moduleId}.settings.enabled.name`,
    hint: `${moduleId}.settings.enabled.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(moduleId, "anthropicApiKey", {
    name: `${moduleId}.settings.anthropicApiKey.name`,
    hint: `${moduleId}.settings.anthropicApiKey.hint`,
    scope: "client",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "model", {
    name: `${moduleId}.settings.model.name`,
    hint: `${moduleId}.settings.model.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "claude-3-7-sonnet-latest",
  });

  game.settings.register(moduleId, "maxTokens", {
    name: `${moduleId}.settings.maxTokens.name`,
    hint: `${moduleId}.settings.maxTokens.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 500, max: 64000, step: 100 },
    default: 3000,
  });

  game.settings.register(moduleId, "requestEndpoint", {
    name: `${moduleId}.settings.requestEndpoint.name`,
    hint: `${moduleId}.settings.requestEndpoint.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "relayAuthHeader", {
    name: `${moduleId}.settings.relayAuthHeader.name`,
    hint: `${moduleId}.settings.relayAuthHeader.hint`,
    scope: "client",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "replaceGeneratedEffects", {
    name: `${moduleId}.settings.replaceGeneratedEffects.name`,
    hint: `${moduleId}.settings.replaceGeneratedEffects.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(moduleId, "shopCompendium", {
    name: `${moduleId}.settings.shopCompendium.name`,
    hint: `${moduleId}.settings.shopCompendium.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "dnd5e.items",
  });

  game.settings.register(moduleId, "shopCompendiumLimit", {
    name: `${moduleId}.settings.shopCompendiumLimit.name`,
    hint: `${moduleId}.settings.shopCompendiumLimit.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 25, max: 500, step: 25 },
    default: 200,
  });

  game.settings.register(moduleId, "shopUseFameosityPricing", {
    name: `${moduleId}.settings.shopUseFameosityPricing.name`,
    hint: `${moduleId}.settings.shopUseFameosityPricing.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(moduleId, "shopPricingRelationWeight", {
    name: `${moduleId}.settings.shopPricingRelationWeight.name`,
    hint: `${moduleId}.settings.shopPricingRelationWeight.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 5 },
    default: 75,
  });

  game.settings.register(moduleId, "shopPricingTendencyWeight", {
    name: `${moduleId}.settings.shopPricingTendencyWeight.name`,
    hint: `${moduleId}.settings.shopPricingTendencyWeight.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 5 },
    default: 25,
  });

  game.settings.register(moduleId, "shopPricingBuyImpact", {
    name: `${moduleId}.settings.shopPricingBuyImpact.name`,
    hint: `${moduleId}.settings.shopPricingBuyImpact.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.45,
  });

  game.settings.register(moduleId, "shopPricingSellImpact", {
    name: `${moduleId}.settings.shopPricingSellImpact.name`,
    hint: `${moduleId}.settings.shopPricingSellImpact.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.6,
  });

  game.settings.register(moduleId, "anthropicOrchestrationEnabled", {
    name: `${moduleId}.settings.anthropicOrchestrationEnabled.name`,
    hint: `${moduleId}.settings.anthropicOrchestrationEnabled.hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(moduleId, "anthropicOrchestrationMaxCalls", {
    name: `${moduleId}.settings.anthropicOrchestrationMaxCalls.name`,
    hint: `${moduleId}.settings.anthropicOrchestrationMaxCalls.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 2, max: 6, step: 1 },
    default: 3,
  });

  game.settings.register(moduleId, "anthropicOrchestrationPerCallTokenCap", {
    name: `${moduleId}.settings.anthropicOrchestrationPerCallTokenCap.name`,
    hint: `${moduleId}.settings.anthropicOrchestrationPerCallTokenCap.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 500, max: 16000, step: 100 },
    default: 2500,
  });

  game.settings.register(moduleId, "anthropicOrchestrationTotalTokenCap", {
    name: `${moduleId}.settings.anthropicOrchestrationTotalTokenCap.name`,
    hint: `${moduleId}.settings.anthropicOrchestrationTotalTokenCap.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 1500, max: 32000, step: 100 },
    default: 7000,
  });

  game.settings.register(moduleId, "anthropicOrchestrationTimeoutSeconds", {
    name: `${moduleId}.settings.anthropicOrchestrationTimeoutSeconds.name`,
    hint: `${moduleId}.settings.anthropicOrchestrationTimeoutSeconds.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 10, max: 300, step: 5 },
    default: 60,
  });

  game.settings.register(moduleId, "anthropicPlannerModel", {
    name: `${moduleId}.settings.anthropicPlannerModel.name`,
    hint: `${moduleId}.settings.anthropicPlannerModel.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "anthropicIconModel", {
    name: `${moduleId}.settings.anthropicIconModel.name`,
    hint: `${moduleId}.settings.anthropicIconModel.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "anthropicFinalizerModel", {
    name: `${moduleId}.settings.anthropicFinalizerModel.name`,
    hint: `${moduleId}.settings.anthropicFinalizerModel.hint`,
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(moduleId, "generatedIconSource", {
    name: `${moduleId}.settings.generatedIconSource.name`,
    hint: `${moduleId}.settings.generatedIconSource.hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      public: "Public",
      data: "Data",
      s3: "S3",
    },
    default: "public",
  });

  game.settings.register(moduleId, "generatedIconFolder", {
    name: `${moduleId}.settings.generatedIconFolder.name`,
    hint: `${moduleId}.settings.generatedIconFolder.hint`,
    scope: "world",
    config: true,
    type: String,
    filePicker: "folder",
    default: "",
  });

  game.settings.register(moduleId, "generatedIconMaxEntries", {
    name: `${moduleId}.settings.generatedIconMaxEntries.name`,
    hint: `${moduleId}.settings.generatedIconMaxEntries.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 50, max: 3000, step: 50 },
    default: 800,
  });

  game.settings.register(moduleId, "generatedIconPromptLimit", {
    name: `${moduleId}.settings.generatedIconPromptLimit.name`,
    hint: `${moduleId}.settings.generatedIconPromptLimit.hint`,
    scope: "world",
    config: true,
    type: Number,
    range: { min: 20, max: 200, step: 10 },
    default: 80,
  });

  game.settings.register(moduleId, "generatedIconCatalog", {
    scope: "world",
    config: false,
    type: Object,
    default: {
      version: 2,
      source: "public",
      rootFolder: "",
      indexedAt: 0,
      entries: [],
      compendiumEntries: [],
      folderMemory: [],
    },
  });
}

export function registerIconIndexAgentMenu(moduleId, menuType) {
  game.settings.registerMenu(moduleId, "iconIndexAgent", {
    name: `${moduleId}.iconAgent.menuName`,
    hint: `${moduleId}.iconAgent.menuHint`,
    label: `${moduleId}.iconAgent.menuLabel`,
    icon: "fas fa-folder-tree",
    restricted: true,
    type: menuType,
  });
}
