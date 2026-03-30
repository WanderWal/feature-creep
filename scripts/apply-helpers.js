export function createApplyHelpers({ moduleId }) {
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

  async function addGeneratedItemsToActorInventory(actor, items, flagKey, notificationKey) {
    if (!items.length) return;

    const generatedAt = Date.now();
    const createData = items.map((item) => ({
      name: item.name,
      type: item.type,
      system: {
        description: {
          value: item.description
            ? `<p>${item.description}</p>${Number.isFinite(Number(item.craftingDc)) ? `<p><strong>${game.i18n.localize(`${moduleId}.craftDialog.colDc`)}:</strong> ${Math.round(Number(item.craftingDc))}</p>` : ""}`
            : Number.isFinite(Number(item.craftingDc))
              ? `<p><strong>${game.i18n.localize(`${moduleId}.craftDialog.colDc`)}:</strong> ${Math.round(Number(item.craftingDc))}</p>`
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
        [moduleId]: {
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

  async function applyEffects(item, effects) {
    const shouldReplaceGenerated = game.settings.get(moduleId, "replaceGeneratedEffects");

    if (shouldReplaceGenerated) {
      const generated = item.effects.filter((effect) => effect.getFlag(moduleId, "generated") === true);
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
        [moduleId]: {
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

  function normalizeForLookup(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  return {
    clampShopModifier,
    normalizeAiMerchantModifiers,
    getExistingShopDescription,
    addGeneratedItemsToActorInventory,
    sanitizeActorRebalanceUpdates,
    sanitizeMonsterItemUpdates,
    applyEffects,
    applyItemMacro,
    roundPriceModifier,
    normalizeMerchantPriceSpread,
    applyIntegrationFlags,
    normalizeMacroIntegration,
  };
}
