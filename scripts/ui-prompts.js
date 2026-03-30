export function createUiPrompts({ moduleId, helpers }) {
  const {
    getActorCraftingTools,
    getActorCraftingIngredientItems,
    formatCraftingIngredientLabel,
    getItemAvailableQuantity,
    isCraftingTool,
    formatChallengeRating,
    parseChallengeRating,
  } = helpers;

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
        title: game.i18n.localize(`${moduleId}.rebalanceDialog.title`),
        content: `
          <form class="feature-creep-rebalance-form">
            <p>${game.i18n.format(`${moduleId}.rebalanceDialog.content`, {
              name: foundry.utils.escapeHTML(actor.name ?? ""),
              currentCr,
            })}</p>
            <div class="form-group">
              <label for="feature-creep-target-cr">${game.i18n.localize(`${moduleId}.rebalanceDialog.targetLabel`)}</label>
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
            label: game.i18n.localize(`${moduleId}.rebalanceDialog.submit`),
            callback: (html) => {
              const input = html?.[0]?.querySelector("[name='targetCr']");
              const targetCr = parseChallengeRating(input?.value ?? "");
              if (targetCr === null) {
                ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.invalidTargetCr`));
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

  async function promptForCraftingSelection(actor) {
    const availableTools = getActorCraftingTools(actor);
    if (availableTools.length === 0) {
      ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.noCraftingTools`));
      return null;
    }

    const ingredientItems = getActorCraftingIngredientItems(actor);
    if (ingredientItems.length === 0) {
      ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.noCraftingItems`));
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
          aria-label="${foundry.utils.escapeHTML(game.i18n.localize(`${moduleId}.craftDialog.resourceQtyLabel`))}"
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
        title: game.i18n.localize(`${moduleId}.craftDialog.title`),
        content: `
          <form class="feature-creep-crafting-form">
            <p>${game.i18n.localize(`${moduleId}.craftDialog.content`)}</p>
            <div class="form-group">
              <label for="feature-creep-crafting-tool">${game.i18n.localize(`${moduleId}.craftDialog.toolLabel`)}</label>
              <select id="feature-creep-crafting-tool" name="artisanToolId">${toolOptions}</select>
            </div>
            <div class="form-group stacked">
              <label>${game.i18n.localize(`${moduleId}.craftDialog.ingredientsLabel`)}</label>
              <div class="feature-creep-crafting-items">${ingredientOptions}</div>
            </div>
            <div class="form-group stacked">
              <label for="feature-creep-crafting-notes">${game.i18n.localize(`${moduleId}.craftDialog.notesLabel`)}</label>
              <textarea id="feature-creep-crafting-notes" name="craftNotes" rows="3" placeholder="${foundry.utils.escapeHTML(game.i18n.localize(`${moduleId}.craftDialog.notesPlaceholder`))}"></textarea>
            </div>
          </form>
        `,
        buttons: {
          cancel: {
            label: game.i18n.localize("Cancel"),
            callback: () => finish(null),
          },
          submit: {
            label: game.i18n.localize(`${moduleId}.craftDialog.submit`),
            callback: (html) => {
              const root = html?.[0];
              const artisanToolId = String(root?.querySelector("[name='artisanToolId']")?.value || "").trim();
              const notes = String(root?.querySelector("[name='craftNotes']")?.value || "").trim().slice(0, 1200);
              const ingredientIds = Array.from(root?.querySelectorAll("[name='ingredientIds']:checked") ?? [])
                .map((input) => String(input.value || "").trim())
                .filter(Boolean);

              const artisanTool = actor.items.get(artisanToolId);
              if (!artisanTool || !isCraftingTool(artisanTool)) {
                ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.invalidCraftTool`));
                finish(null);
                return;
              }

              const selectedItems = ingredientIds
                .map((id) => actor.items.get(id))
                .filter((item) => item && item.id !== artisanToolId);

              if (selectedItems.length === 0) {
                ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.selectCraftItems`));
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
        title: game.i18n.localize(`${moduleId}.improviseDialog.title`),
        content: `
          <form class="feature-creep-improvise-form">
            <p>${game.i18n.localize(`${moduleId}.improviseDialog.content`)}</p>
            <div class="form-group stacked">
              <label for="feature-creep-improvise-situation">${game.i18n.localize(`${moduleId}.improviseDialog.situationLabel`)}</label>
              <textarea id="feature-creep-improvise-situation" name="situation" rows="4" placeholder="${foundry.utils.escapeHTML(game.i18n.localize(`${moduleId}.improviseDialog.situationPlaceholder`))}"></textarea>
            </div>
            ${journals.length > 0 ? `
            <div class="form-group stacked">
              <label>${game.i18n.localize(`${moduleId}.improviseDialog.journalsLabel`)}</label>
              <div class="feature-creep-improvise-list">${journalOptions}</div>
            </div>
            ` : ""}
            ${actors.length > 0 ? `
            <div class="form-group stacked">
              <label>${game.i18n.localize(`${moduleId}.improviseDialog.actorsLabel`)}</label>
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
            label: game.i18n.localize(`${moduleId}.improviseDialog.submit`),
            callback: (html) => {
              const root = html?.[0];
              const situation = String(root?.querySelector("[name='situation']")?.value || "").trim();
              if (!situation) {
                ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.improviseNoSituation`));
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
        `<option value="">${foundry.utils.escapeHTML(game.i18n.localize(`${moduleId}.journalDialog.actorNone`))}</option>`,
        ...actors.map((actor) => `<option value="${actor.id}">${foundry.utils.escapeHTML(actor.name)}</option>`),
      ].join("");

      const dialog = new Dialog({
        title: game.i18n.localize(`${moduleId}.journalDialog.actorPromptTitle`),
        content: `
          <form class="feature-creep-journal-actor-form">
            <p>${game.i18n.localize(`${moduleId}.journalDialog.actorPromptContent`)}</p>
            <div class="form-group">
              <label for="feature-creep-journal-actor">${game.i18n.localize(`${moduleId}.journalDialog.actorLabel`)}</label>
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
            label: game.i18n.localize(`${moduleId}.journalDialog.actorSubmit`),
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

  function getImproviseCandidateJournals() {
    return Array.from(game.journal ?? [])
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }

  function getJournalCandidateActors() {
    return Array.from(game.actors ?? [])
      .filter((actor) => actor?.type === "character" || actor?.type === "npc")
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  }

  return {
    promptForTargetCr,
    promptForCraftingSelection,
    promptForImproviseSelection,
    promptForJournalActorSelection,
  };
}
