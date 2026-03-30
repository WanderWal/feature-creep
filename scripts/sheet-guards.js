export function canUseModule() {
  return game.user?.isGM;
}

export function isDnd5eItemSheet(sheet) {
  const item = sheet?.document;
  if (!item) return false;
  return game.system?.id === "dnd5e" && item.documentName === "Item";
}

export function isDnd5eNpcSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  return game.system?.id === "dnd5e" && actor.documentName === "Actor" && actor.type === "npc";
}

export function isDnd5eCharacterSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  return game.system?.id === "dnd5e" && actor.documentName === "Actor" && actor.type === "character";
}

export function isDnd5eCraftingActorSheet(sheet) {
  const actor = sheet?.document;
  if (!actor) return false;
  if (game.system?.id !== "dnd5e" || actor.documentName !== "Actor") return false;
  return actor.type === "character" || actor.type === "npc";
}

export function isJournalSheet(sheet) {
  const document = sheet?.document;
  if (!document) return false;
  return document.documentName === "JournalEntry" || document.documentName === "JournalEntryPage";
}
