export function createIconIndexAgentMenuClass({ moduleId, iconIndexAgent }) {
  return class FeatureCreepIconIndexAgentMenu extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id: `${moduleId}-icon-index-agent-menu`,
        title: game.i18n.localize(`${moduleId}.iconAgent.menuTitle`),
        template: `modules/${moduleId}/templates/icon-index-agent-menu.hbs`,
        width: 620,
        closeOnSubmit: false,
      });
    }

    getData() {
      const memory = iconIndexAgent.getMemorySnapshot?.() ?? {};
      const indexedAt = Number(memory.indexedAt) || 0;
      const source = String(game.settings.get(moduleId, "generatedIconSource") || "public");

      return {
        source,
        sourcePublic: source === "public",
        sourceData: source === "data",
        sourceS3: source === "s3",
        folder: String(game.settings.get(moduleId, "generatedIconFolder") || ""),
        maxEntries: Number(game.settings.get(moduleId, "generatedIconMaxEntries") || 800),
        promptLimit: Number(game.settings.get(moduleId, "generatedIconPromptLimit") || 80),
        indexedAtLabel: indexedAt ? new Date(indexedAt).toLocaleString() : game.i18n.localize(`${moduleId}.iconAgent.notIndexed`),
        indexedCount: Array.isArray(memory.entries) ? memory.entries.length : 0,
        folderCount: Array.isArray(memory.folderMemory) ? memory.folderMemory.length : 0,
      };
    }

    activateListeners(html) {
      super.activateListeners(html);

      html.find(".feature-creep-icon-agent-index").on("click", async (event) => {
        event.preventDefault();
        await this._saveFormSettings(html);

        ui.notifications.info(game.i18n.localize(`${moduleId}.notifications.iconIndexing`));
        const memory = await iconIndexAgent.indexAllIcons();
        ui.notifications.info(game.i18n.format(`${moduleId}.notifications.iconIndexed`, {
          count: Array.isArray(memory?.entries) ? memory.entries.length : 0,
        }));
        this.render(true);
      });

      html.find(".feature-creep-icon-agent-clear").on("click", async (event) => {
        event.preventDefault();
        await iconIndexAgent.clearMemory();
        ui.notifications.info(game.i18n.localize(`${moduleId}.notifications.iconMemoryCleared`));
        this.render(true);
      });
    }

    async _saveFormSettings(html) {
      const source = String(html.find('[name="source"]').val() || "public").trim() || "public";
      const folder = String(html.find('[name="folder"]').val() || "").trim();
      const maxEntries = Math.max(50, Math.min(3000, Number(html.find('[name="maxEntries"]').val()) || 800));
      const promptLimit = Math.max(20, Math.min(200, Number(html.find('[name="promptLimit"]').val()) || 80));

      await game.settings.set(moduleId, "generatedIconSource", source);
      await game.settings.set(moduleId, "generatedIconFolder", folder);
      await game.settings.set(moduleId, "generatedIconMaxEntries", maxEntries);
      await game.settings.set(moduleId, "generatedIconPromptLimit", promptLimit);
    }

    async _updateObject() {
      return;
    }
  };
}