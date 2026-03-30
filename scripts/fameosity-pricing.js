export function createFameosityPricing({ moduleId, helpers }) {
  const {
    clampShopModifier,
    roundPriceModifier,
    normalizeMerchantPriceSpread,
  } = helpers;

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
      console.warn(`${moduleId} | fameosity pricing integration failed`, error);
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
    const enabled = game.settings.get(moduleId, "shopUseFameosityPricing") !== false;

    const relationWeight = Math.max(0, Number(game.settings.get(moduleId, "shopPricingRelationWeight")) || 0);
    const tendencyWeight = Math.max(0, Number(game.settings.get(moduleId, "shopPricingTendencyWeight")) || 0);

    const buyImpact = Math.max(0, Math.min(1, Number(game.settings.get(moduleId, "shopPricingBuyImpact")) || 0));
    const sellImpact = Math.max(0, Math.min(1, Number(game.settings.get(moduleId, "shopPricingSellImpact")) || 0));

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

  return {
    applyFameosityPricingToMerchant,
    getFameosityApi,
    getFameosityPlayerCharacters,
    getFameosityNpcTendency,
    getFameosityNpcRelationToPc,
    clampReputationScore,
    getShopPricingConfig,
    computeWeightedReputationScore,
    computeReputationPriceModifiers,
  };
}
