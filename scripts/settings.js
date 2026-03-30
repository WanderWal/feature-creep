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
}
