export function createUiDialogs({ moduleId, helpers, actions }) {
  const {
    resolveJournalEntry,
    sanitizeGeneratedInventoryItems,
    isBeaversCraftingIntegrationAvailable,
    formatChallengeRating,
  } = helpers;

  const {
    applyCharacterShopToActor,
    addLootToActorInventory,
    createWorldItemsFromJournal,
    addCraftedItemsToActorInventory,
    createBeaversRecipesFromCrafting,
  } = actions;

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
          <th>${game.i18n.localize(`${moduleId}.lootDialog.colName`)}</th>
          <th>${game.i18n.localize(`${moduleId}.lootDialog.colType`)}</th>
          <th>${game.i18n.localize(`${moduleId}.lootDialog.colQty`)}</th>
          ${showCraftingDc ? `<th>${game.i18n.localize(`${moduleId}.craftDialog.colDc`)}</th>` : ""}
          <th>${game.i18n.localize(`${moduleId}.lootDialog.colWeight`)}</th>
          <th>${game.i18n.localize(`${moduleId}.lootDialog.colPrice`)}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
  }

  /**
   * Show the improvise result dialog, with option to save to a selected journal.
   * @param {object} result - The improvise result object.
   * @param {object} [options] - Extra options.
   * @param {string} [options.prompt] - The original prompt/situation text.
   * @param {Array} [options.selectedJournals] - Array of selected JournalEntry objects.
   */
  function showImproviseResultDialog(result, options = {}) {
    const { prompt = "", selectedJournals = [] } = options;
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
          <h3>${game.i18n.localize(`${moduleId}.improviseResult.openingLabel`)}</h3>
          <p class="feature-creep-improvise-opening">${opening}</p>
        </div>` : ""}
        ${npcHtml ? `<div class="feature-creep-improvise-section">
          <h3>${game.i18n.localize(`${moduleId}.improviseResult.npcReactionsLabel`)}</h3>
          ${npcHtml}
        </div>` : ""}
        ${outcomesHtml ? `<div class="feature-creep-improvise-section">
          <h3>${game.i18n.localize(`${moduleId}.improviseResult.outcomesLabel`)}</h3>
          ${outcomesHtml}
        </div>` : ""}
        ${mechanicsHtml ? `<div class="feature-creep-improvise-section">
          <h3>${game.i18n.localize(`${moduleId}.improviseResult.mechanicsLabel`)}</h3>
          ${mechanicsHtml}
        </div>` : ""}
        ${dmTips ? `<div class="feature-creep-improvise-section feature-creep-improvise-tips">
          <h3>${game.i18n.localize(`${moduleId}.improviseResult.dmTipsLabel`)}</h3>
          <p><em>${dmTips}</em></p>
        </div>` : ""}
      </div>
    `;

    const dialog = new Dialog({
      title: game.i18n.localize(`${moduleId}.improviseResult.title`),
      content,
      buttons: {
        post: {
          label: game.i18n.localize(`${moduleId}.improviseResult.postToChat`),
          callback: () => postImproviseToChat(result),
        },
        save: {
          label: game.i18n.localize(`${moduleId}.improviseResult.saveToJournal`),
          callback: async () => {
            if (!selectedJournals.length) {
              ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.noJournalSelected`));
              return;
            }
            const journal = selectedJournals[0];
            const pageName = game.i18n.localize(`${moduleId}.improviseResult.journalPageTitle`) + ` (${new Date().toLocaleString()})`;
            let html = `<h2>${game.i18n.localize(`${moduleId}.improviseResult.promptLabel`)}</h2>`;
            html += `<p>${foundry.utils.escapeHTML(prompt)}</p>`;
            html += `<hr/>`;
            html += content;
            await journal.createEmbeddedDocuments("JournalEntryPage", [{
              name: pageName,
              type: "text",
              text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
            }]);
            ui.notifications.info(game.i18n.format(`${moduleId}.notifications.improviseSavedToJournal`, { name: journal.name }));
          },
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
      lines.push(`<p><strong>${game.i18n.localize(`${moduleId}.improviseResult.openingLabel`)}</strong></p>`);
      lines.push(`<p>${foundry.utils.escapeHTML(result.opening)}</p>`);
    }

    if (result.npcReactions.length > 0) {
      lines.push(`<p><strong>${game.i18n.localize(`${moduleId}.improviseResult.npcReactionsLabel`)}</strong></p>`);
      lines.push(`<ul>${result.npcReactions.map((r) =>
        `<li><strong>${foundry.utils.escapeHTML(String(r?.name || ""))}</strong>: ${foundry.utils.escapeHTML(String(r?.reaction || ""))}</li>`
      ).join("")}</ul>`);
    }

    if (result.outcomes.length > 0) {
      lines.push(`<p><strong>${game.i18n.localize(`${moduleId}.improviseResult.outcomesLabel`)}</strong></p>`);
      lines.push(`<ul>${result.outcomes.map((o) => `<li>${foundry.utils.escapeHTML(o)}</li>`).join("")}</ul>`);
    }

    if (result.mechanics.length > 0) {
      lines.push(`<p><strong>${game.i18n.localize(`${moduleId}.improviseResult.mechanicsLabel`)}</strong></p>`);
      lines.push(`<ul>${result.mechanics.map((m) => `<li>${foundry.utils.escapeHTML(m)}</li>`).join("")}</ul>`);
    }

    if (result.dmTips) {
      lines.push(`<p><strong>${game.i18n.localize(`${moduleId}.improviseResult.dmTipsLabel`)}</strong></p>`);
      lines.push(`<p><em>${foundry.utils.escapeHTML(result.dmTips)}</em></p>`);
    }

    await ChatMessage.create({
      content: lines.join("\n"),
      whisper: ChatMessage.getWhisperRecipients("GM"),
    });

    ui.notifications.info(game.i18n.localize(`${moduleId}.notifications.improvisePostedToChat`));
  }

  function showCharacterShopDialog(actor, result) {
    const items = Array.isArray(result.inventory) ? result.inventory : [];
    const rationale = foundry.utils.escapeHTML(result.rationale || "");
    const shopDescription = foundry.utils.escapeHTML(result.shopDescription || "");
    const tableHtml = buildGeneratedItemTable(items, `${moduleId}.shopDialog.noItems`);

    const buttons = {
      close: {
        label: game.i18n.localize("Close"),
      },
    };

    if (items.length > 0) {
      buttons.apply = {
        label: game.i18n.localize(`${moduleId}.shopDialog.apply`),
        callback: () => applyCharacterShopToActor(actor, result),
      };
    }

    const dialog = new Dialog({
      title: game.i18n.format(`${moduleId}.shopDialog.title`, {
        name: foundry.utils.escapeHTML(actor.name ?? ""),
      }),
      content: `
        <div class="feature-creep-shop-result">
          <p><strong>${game.i18n.localize(`${moduleId}.shopDialog.shopName`)}</strong>: ${foundry.utils.escapeHTML(result.shopName || actor.name || "")}</p>
          ${shopDescription ? `<p><strong>${game.i18n.localize(`${moduleId}.shopDialog.shopDescription`)}</strong>: ${shopDescription}</p>` : ""}
          ${tableHtml}
          ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
        </div>`,
      buttons,
      default: items.length > 0 ? "apply" : "close",
    });

    dialog.render(true);
  }

  function showLootGenerationDialog(actor, result) {
    const sanitizedLoot = sanitizeGeneratedInventoryItems(result.loot);
    const rationale = foundry.utils.escapeHTML(result.rationale || "");
    const tableHtml = buildGeneratedItemTable(sanitizedLoot, `${moduleId}.lootDialog.noItems`);

    const buttons = {
      close: {
        label: game.i18n.localize("Close"),
      },
    };

    if (sanitizedLoot.length > 0) {
      buttons.add = {
        label: game.i18n.localize(`${moduleId}.lootDialog.addToInventory`),
        callback: () => addLootToActorInventory(actor, sanitizedLoot),
      };
    }

    const dialog = new Dialog({
      title: game.i18n.format(`${moduleId}.lootDialog.title`, {
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
    const tableHtml = buildGeneratedItemTable(sanitizedItems, `${moduleId}.journalDialog.noItems`);

    const buttons = {
      close: {
        label: game.i18n.localize("Close"),
      },
    };

    if (sanitizedItems.length > 0) {
      buttons.create = {
        label: game.i18n.localize(`${moduleId}.journalDialog.createItems`),
        callback: () => createWorldItemsFromJournal(journal, sanitizedItems),
      };
    }

    const dialog = new Dialog({
      title: game.i18n.format(`${moduleId}.journalDialog.title`, {
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

  function showCraftedItemsDialog(actor, artisanTool, ingredientResources, result) {
    const craftedItems = sanitizeGeneratedInventoryItems(result.items, { includeCraftingDc: true });
    const rationale = foundry.utils.escapeHTML(result.rationale || "");
    const ingredientNames = ingredientResources
      .map((resource) => `${resource.quantity}x ${foundry.utils.escapeHTML(resource.item.name)}`)
      .join(", ");

    const tableHtml = buildGeneratedItemTable(craftedItems, `${moduleId}.craftDialog.noItems`, {
      showCraftingDc: true,
    });

    const buttons = {
      close: {
        label: game.i18n.localize("Close"),
      },
    };

    if (craftedItems.length > 0) {
      buttons.add = {
        label: game.i18n.localize(`${moduleId}.craftDialog.addToInventory`),
        callback: () => addCraftedItemsToActorInventory(actor, craftedItems),
      };

      if (isBeaversCraftingIntegrationAvailable()) {
        buttons.recipe = {
          label: game.i18n.localize(`${moduleId}.craftDialog.createRecipes`),
          callback: () => createBeaversRecipesFromCrafting(actor, artisanTool, ingredientResources, craftedItems, result),
        };
      }
    }

    const dialog = new Dialog({
      title: game.i18n.format(`${moduleId}.craftDialog.resultsTitle`, {
        name: foundry.utils.escapeHTML(actor.name ?? ""),
      }),
      content: `
        <div class="feature-creep-generated-result">
          <p class="feature-creep-generated-summary">${game.i18n.format(`${moduleId}.craftDialog.summary`, {
            tool: foundry.utils.escapeHTML(artisanTool.name ?? ""),
            count: ingredientResources.length,
          })}</p>
          <p class="feature-creep-generated-inputs"><strong>${game.i18n.localize(`${moduleId}.craftDialog.ingredientsLabel`)}</strong>: ${ingredientNames}</p>
          ${tableHtml}
          ${rationale ? `<p class="feature-creep-loot-rationale"><em>${rationale}</em></p>` : ""}
        </div>
      `,
      buttons,
      default: craftedItems.length > 0 ? "add" : "close",
    });

    dialog.render(true);
  }

  function showCrGuessResultDialog(actor, result) {
    const estimatedCr = formatChallengeRating(result.estimatedCr) || "?";
    const currentCr = formatChallengeRating(actor.system?.details?.cr) || game.i18n.localize("Unknown");
    const confidence = game.i18n.localize(`${moduleId}.confidence.${result.confidence}`);
    const rationale = foundry.utils.escapeHTML(result.rationale || game.i18n.localize(`${moduleId}.guessCr.noRationale`));

    ui.notifications.info(game.i18n.format(`${moduleId}.notifications.guessCrSuccess`, {
      cr: estimatedCr,
    }));

    const dialog = new Dialog({
      title: game.i18n.localize(`${moduleId}.guessCrDialog.title`),
      content: `
        <div class="feature-creep-guess-cr-result">
          <p>${game.i18n.format(`${moduleId}.guessCrDialog.summary`, {
            name: foundry.utils.escapeHTML(actor.name ?? ""),
            estimatedCr,
            confidence,
            currentCr,
          })}</p>
          <p><strong>${game.i18n.localize(`${moduleId}.guessCrDialog.rationaleLabel`)}</strong></p>
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

  return {
    showImproviseResultDialog,
    showCharacterShopDialog,
    showLootGenerationDialog,
    showJournalItemsDialog,
    showCraftedItemsDialog,
    showCrGuessResultDialog,
  };
}
