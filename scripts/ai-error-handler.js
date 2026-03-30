export function notifyAiRequestFailure({ moduleId, error, fallbackNotificationKey }) {
  const message = String(error?.message || "");
  const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);

  if (isCorsError) {
    ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.corsBlocked`));
    return;
  }

  ui.notifications.error(game.i18n.localize(fallbackNotificationKey));
}
