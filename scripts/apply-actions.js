export function createApplyActions({ moduleId, helpers }) {
  const {
    isItemPilesShopIntegrationAvailable,
    isBeaversCraftingIntegrationAvailable,
    normalizeAiMerchantModifiers,
    getExistingShopDescription,
    normalizeMerchantPriceSpread,
    applyFameosityPricingToMerchant,
    addGeneratedItemsToActorInventory,
    createCraftingOutputTemplateItems,
    resolveToolUuidForBeaversTest,
    buildBeaversRecipeItemData,
    toActivityMap,
    applyEffects,
    applyItemMacro,
    applyIntegrationFlags,
    normalizeMacroIntegration,
    sanitizeActorRebalanceUpdates,
    sanitizeMonsterItemUpdates,
  } = helpers;

  async function applyCharacterShopToActor(actor, result) {
    try {
      if (!isItemPilesShopIntegrationAvailable()) {
        ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.shopIntegrationMissing`));
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
          item.flags[moduleId] = {
            ...(item.flags[moduleId] ?? {}),
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
                [moduleId]: {
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

      ui.notifications.info(game.i18n.format(`${moduleId}.notifications.shopApplied`, {
        count: items.length,
        name: actor.name,
      }));

      if (pricingResult.applied) {
        ui.notifications.info(game.i18n.format(`${moduleId}.notifications.shopPricingApplied`, {
          count: pricingResult.count,
        }));
      }
    } catch (error) {
      console.error(`${moduleId} | failed to apply generated shop`, error);
      ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.shopApplyFailed`));
    }
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
        [moduleId]: {
          generatedJournalItem: true,
          generatedAt,
          sourceJournalUuid: journal.uuid,
        },
      },
    }));

    await Item.create(createData);

    ui.notifications.info(game.i18n.format(`${moduleId}.notifications.journalItemsCreated`, {
      count: items.length,
      name: journal.name,
    }));
  }

  async function createBeaversRecipesFromCrafting(actor, toolItem, ingredientResources, craftedItems, result) {
    try {
      if (!isBeaversCraftingIntegrationAvailable()) {
        ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.recipeIntegrationMissing`));
        return;
      }

      ui.notifications.info(game.i18n.localize(`${moduleId}.notifications.creatingRecipes`));

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
        ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.recipeCreateNone`));
        return;
      }

      ui.notifications.info(game.i18n.format(`${moduleId}.notifications.recipeCreated`, {
        count: recipeItems.length,
      }));
    } catch (error) {
      console.error(`${moduleId} | beavers recipe creation failed`, error);
      ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.recipeCreateFailed`));
    }
  }

  async function addLootToActorInventory(actor, lootItems) {
    await addGeneratedItemsToActorInventory(actor, lootItems, "generatedLoot", `${moduleId}.notifications.lootAdded`);
  }

  async function addCraftedItemsToActorInventory(actor, craftedItems) {
    await addGeneratedItemsToActorInventory(actor, craftedItems, "generatedCraft", `${moduleId}.notifications.craftAdded`);
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

  return {
    applyCharacterShopToActor,
    createWorldItemsFromJournal,
    createBeaversRecipesFromCrafting,
    addLootToActorInventory,
    addCraftedItemsToActorInventory,
    applyPayloadToItem,
    applyMonsterRebalance,
  };
}
