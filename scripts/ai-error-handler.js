export function notifyAiRequestFailure({ moduleId, error, fallbackNotificationKey }) {
  const message = String(error?.message || "");
  const isCorsError = error instanceof TypeError && /fetch|failed|cors|network/i.test(message);
  const isTimeoutError = error?.code === "AI_TIMEOUT" || /timed out/i.test(message);
  const isBudgetError = error?.code === "ORCH_BUDGET";

  if (isCorsError) {
    ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.corsBlocked`));
    return;
  }

  if (isTimeoutError) {
    ui.notifications.error(game.i18n.localize(`${moduleId}.notifications.requestTimedOut`));
    return;
  }

  if (isBudgetError) {
    ui.notifications.warn(game.i18n.localize(`${moduleId}.notifications.orchestrationBudgetExceeded`));
    return;
  }

  ui.notifications.error(game.i18n.localize(fallbackNotificationKey));
}
