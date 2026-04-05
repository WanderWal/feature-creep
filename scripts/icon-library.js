const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"]);
const STOP_WORDS = new Set(["of", "the", "and", "a", "to", "in", "for", "with"]);
const SCORING = {
  DIRECT: 25,
  PARTIAL: 15,
  FUZZY: 5,
  FUZZY_THRESHOLD: 2,
  FUZZY_RATIO: 0.3,
  MIN_KEYWORD_LENGTH: 3,
};
const COMPENDIUM_SCORE_BOOST = 20;
const IGNORED_DIR_PATTERNS = [
  /(modules|systems)\/[^/]+\/node_modules(\/|$)/i,
  /(modules|systems)\/[^/]+\/lang(\/|$)/i,
  /(modules|systems)\/[^/]+\/languages(\/|$)/i,
  /(modules|systems)\/[^/]+\/packs(\/|$)/i,
  /(modules|systems)\/[^/]+\/src(\/|$)/i,
  /(modules|systems)\/[^/]+\/templates(\/|$)/i,
  /(modules|systems)\/[^/]+\/docs(\/|$)/i,
  /(modules|systems)\/[^/]+\/test(s)?(\/|$)/i,
];

const TYPE_HINTS = {
  loot: ["loot", "coin", "pouch", "bag", "gem", "treasure", "material", "goods"],
  weapon: ["weapon", "sword", "axe", "bow", "dagger", "spear", "mace", "hammer", "blade"],
  equipment: ["armor", "shield", "cloak", "helm", "boots", "gauntlet", "equipment", "gear"],
  consumable: ["potion", "elixir", "vial", "consumable", "ration", "food", "drink", "scroll"],
  tool: ["tool", "kit", "artisan", "instrument", "hammer", "tongs", "needle", "chisel"],
  container: ["container", "chest", "box", "crate", "satchel", "pack", "bag", "case"],
};

const TYPE_FALLBACK_ICON = {
  loot: "icons/commodities/treasure/chest-gold-shine-brown.webp",
  weapon: "icons/weapons/swords/sword-guard-steel-blue.webp",
  equipment: "icons/equipment/chest/breastplate-layered-steel.webp",
  consumable: "icons/consumables/potions/potion-bottle-corked-labeled-red.webp",
  tool: "icons/tools/hand/hammer-and-nail.webp",
  container: "icons/containers/chest/chest-banded-iron.webp",
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9/._-]+/g, " ")
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value).replace(/[._/-]+/g, " ");
  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= SCORING.MIN_KEYWORD_LENGTH)
    .filter((token) => !STOP_WORDS.has(token));
}

function getExtension(filePath) {
  const basename = String(filePath || "").split("/").pop() || "";
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return basename.slice(dotIndex + 1).toLowerCase();
}

function toFilePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/g, "");
}

function shouldIgnoreDirectory(path) {
  const normalized = toFilePath(path);
  if (!normalized) return true;
  return IGNORED_DIR_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeScoreToken(token) {
  return token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
}

function tokenizeQuery(value) {
  return tokenize(value).map((token) => normalizeScoreToken(token));
}

function getParentFolder(path) {
  const normalized = String(path || "");
  const split = normalized.split("/");
  split.pop();
  return split.join("/");
}

function getFileStem(path) {
  const basename = String(path || "").split("/").pop() || "";
  return basename.replace(/\.[^.]+$/, "");
}

function keywordsFromPathOrName(value) {
  return Array.from(new Set(tokenize(value).map((token) => normalizeScoreToken(token))));
}

function levenshteinDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const matrix = Array.from({ length: right.length + 1 }, () => Array(left.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[j][0] = j;

  for (let j = 1; j <= right.length; j += 1) {
    for (let i = 1; i <= left.length; i += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }

  return matrix[right.length][left.length];
}

function tokenMatchScore(term, keyword) {
  if (!term || !keyword) return 0;
  if (term === keyword) return SCORING.DIRECT;
  if (keyword.includes(term) || term.includes(keyword)) return SCORING.PARTIAL;

  const distance = levenshteinDistance(term, keyword);
  const maxDistance = Math.max(SCORING.FUZZY_THRESHOLD, Math.ceil(term.length * SCORING.FUZZY_RATIO));
  return distance <= maxDistance ? SCORING.FUZZY : 0;
}

function scoreByTokenSets(searchTerms, keywords) {
  let score = 0;
  for (const term of searchTerms) {
    for (const keyword of keywords) {
      score += tokenMatchScore(term, keyword);
    }
  }
  return score;
}

function buildFolderMemory(paths, rootFolder) {
  const grouped = new Map();

  for (const path of paths) {
    const folder = getParentFolder(path);
    if (!grouped.has(folder)) grouped.set(folder, []);
    grouped.get(folder).push(path);
  }

  const records = [];
  for (const [folder, files] of grouped.entries()) {
    const folderTail = folder.replace(`${rootFolder}/`, "");
    const tokenSet = new Set(tokenize(folderTail));

    records.push({
      folder,
      relativeFolder: folderTail,
      count: files.length,
      folderTokens: Array.from(tokenSet).slice(0, 16),
      samplePaths: files.slice(0, 5),
    });
  }

  records.sort((left, right) => right.count - left.count || left.folder.localeCompare(right.folder));
  return records;
}

function pickBalancedPaths(paths, maxEntries) {
  if (paths.length <= maxEntries) return paths;

  const grouped = new Map();
  for (const path of paths) {
    const folder = getParentFolder(path) || "(root)";
    if (!grouped.has(folder)) grouped.set(folder, []);
    grouped.get(folder).push(path);
  }

  for (const list of grouped.values()) {
    list.sort((left, right) => left.localeCompare(right));
  }

  const folders = Array.from(grouped.keys()).sort((left, right) => left.localeCompare(right));
  const picked = [];
  let cursor = 0;

  while (picked.length < maxEntries && folders.length > 0) {
    if (cursor >= folders.length) cursor = 0;
    const folder = folders[cursor];
    const queue = grouped.get(folder) ?? [];

    if (queue.length === 0) {
      folders.splice(cursor, 1);
      continue;
    }

    picked.push(queue.shift());
    cursor += 1;
  }

  return picked;
}

export function createIconIndexAgent({ moduleId }) {
  async function browseFolderRecursive(source, folderPath, visited, output) {
    const normalizedPath = toFilePath(folderPath);
    if (!normalizedPath || visited.has(normalizedPath)) return;
    if (shouldIgnoreDirectory(normalizedPath)) return;

    visited.add(normalizedPath);

    let response;
    try {
      response = await FilePicker.browse(source, normalizedPath);
    } catch {
      return;
    }

    for (const filePath of Array.isArray(response?.files) ? response.files : []) {
      const path = toFilePath(filePath);
      if (!path) continue;
      if (!IMAGE_EXTENSIONS.has(getExtension(path))) continue;
      output.push(path);
    }

    for (const dirPath of Array.isArray(response?.dirs) ? response.dirs : []) {
      await browseFolderRecursive(source, dirPath, visited, output);
    }
  }

  function buildCatalogEntries(files) {
    return files.map((path) => {
      const stem = getFileStem(path);
      const tokenSet = new Set(keywordsFromPathOrName(path));

      return {
        path,
        label: stem,
        tokens: Array.from(tokenSet).slice(0, 24),
        source: "file",
      };
    });
  }

  async function buildCompendiumEntries(maxEntries) {
    const byPath = new Map();

    for (const pack of game.packs ?? []) {
      if (pack?.documentName !== "Item") continue;

      let index = null;
      try {
        index = await pack.getIndex({ fields: ["img"] });
      } catch {
        index = null;
      }
      if (!index) continue;

      for (const entry of Array.from(index)) {
        const path = toFilePath(entry?.img);
        if (!path || path.includes("mystery-man")) continue;

        const label = String(entry?.name || "").trim();
        if (!label) continue;

        const tokenSet = new Set(keywordsFromPathOrName(label));
        if (tokenSet.size === 0) continue;

        const existing = byPath.get(path);
        if (!existing) {
          byPath.set(path, {
            path,
            label,
            tokens: Array.from(tokenSet),
            source: "compendium",
            count: 1,
          });
          continue;
        }

        existing.count += 1;
        for (const token of tokenSet) {
          if (!existing.tokens.includes(token)) existing.tokens.push(token);
        }
      }
    }

    return Array.from(byPath.values())
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
      .slice(0, Math.max(0, Math.floor(maxEntries / 2)))
      .map((entry) => ({
        path: entry.path,
        label: entry.label,
        tokens: entry.tokens.slice(0, 24),
        source: entry.source,
      }));
  }

  async function rebuildIconCatalog() {
    const source = String(game.settings.get(moduleId, "generatedIconSource") || "public");
    const rootFolder = toFilePath(game.settings.get(moduleId, "generatedIconFolder"));
    const maxEntries = Math.max(50, Math.min(3000, Number(game.settings.get(moduleId, "generatedIconMaxEntries")) || 800));

    if (!rootFolder) {
      const emptyCache = {
        version: 2,
        source,
        rootFolder: "",
        indexedAt: Date.now(),
        entries: [],
        compendiumEntries: [],
        folderMemory: [],
      };
      await game.settings.set(moduleId, "generatedIconCatalog", emptyCache);
      return emptyCache;
    }

    const files = [];
    await browseFolderRecursive(source, rootFolder, new Set(), files);

    const unique = Array.from(new Set(files));
    const balancedPaths = pickBalancedPaths(unique, maxEntries);
    const entries = buildCatalogEntries(balancedPaths);
    const compendiumEntries = await buildCompendiumEntries(maxEntries);
    const folderMemory = buildFolderMemory(unique, rootFolder);

    const cache = {
      version: 2,
      source,
      rootFolder,
      indexedAt: Date.now(),
      entries,
      compendiumEntries,
      folderMemory,
    };

    await game.settings.set(moduleId, "generatedIconCatalog", cache);
    return cache;
  }

  async function indexAllIcons() {
    return rebuildIconCatalog();
  }

  async function clearMemory() {
    await game.settings.set(moduleId, "generatedIconCatalog", {
      version: 2,
      source: String(game.settings.get(moduleId, "generatedIconSource") || "public"),
      rootFolder: toFilePath(game.settings.get(moduleId, "generatedIconFolder")),
      indexedAt: 0,
      entries: [],
      compendiumEntries: [],
      folderMemory: [],
    });
  }

  function getCachedCatalog() {
    const cache = game.settings.get(moduleId, "generatedIconCatalog");
    if (!cache || typeof cache !== "object") return null;
    const entries = Array.isArray(cache.entries) ? cache.entries : [];
    const compendiumEntries = Array.isArray(cache.compendiumEntries) ? cache.compendiumEntries : [];
    const folderMemory = Array.isArray(cache.folderMemory) ? cache.folderMemory : [];

    return {
      version: Number(cache.version) || 1,
      source: String(cache.source || game.settings.get(moduleId, "generatedIconSource") || "public"),
      rootFolder: toFilePath(cache.rootFolder),
      indexedAt: Number(cache.indexedAt) || 0,
      entries: entries
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          path: toFilePath(entry.path),
          label: String(entry.label || "").trim(),
          tokens: Array.isArray(entry.tokens) ? entry.tokens.map((token) => String(token)).slice(0, 24) : [],
        }))
        .filter((entry) => entry.path),
      compendiumEntries: compendiumEntries
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          path: toFilePath(entry.path),
          label: String(entry.label || "").trim(),
          tokens: Array.isArray(entry.tokens) ? entry.tokens.map((token) => String(token)).slice(0, 24) : [],
          source: "compendium",
        }))
        .filter((entry) => entry.path),
      folderMemory: folderMemory
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          folder: toFilePath(entry.folder),
          relativeFolder: String(entry.relativeFolder || "").trim(),
          count: Math.max(0, Math.round(Number(entry.count) || 0)),
          folderTokens: Array.isArray(entry.folderTokens) ? entry.folderTokens.map((token) => String(token)).slice(0, 16) : [],
          samplePaths: Array.isArray(entry.samplePaths) ? entry.samplePaths.map((path) => toFilePath(path)).slice(0, 5) : [],
        }))
        .filter((entry) => entry.folder),
    };
  }

  async function ensureIconCatalog() {
    const rootFolder = toFilePath(game.settings.get(moduleId, "generatedIconFolder"));
    if (!rootFolder) {
      return {
        version: 2,
        source: "public",
        rootFolder: "",
        indexedAt: 0,
        entries: [],
        compendiumEntries: [],
        folderMemory: [],
      };
    }

    const source = String(game.settings.get(moduleId, "generatedIconSource") || "public");
    const cached = getCachedCatalog();

    if (!cached) {
      return {
        version: 2,
        source,
        rootFolder,
        indexedAt: 0,
        entries: [],
        compendiumEntries: [],
        folderMemory: [],
      };
    }

    if (cached.version < 2 || cached.source !== source || cached.rootFolder !== rootFolder) {
      return {
        version: 2,
        source,
        rootFolder,
        indexedAt: 0,
        entries: [],
        folderMemory: [],
      };
    }

    return {
      ...cached,
      source,
      rootFolder,
    };
  }

  async function getIconPromptContext() {
    const catalog = await ensureIconCatalog();
    const limit = Math.min(200, Math.max(20, Number(game.settings.get(moduleId, "generatedIconPromptLimit")) || 80));

    const iconOptions = catalog.entries.slice(0, limit).map((entry) => ({
      path: entry.path,
      label: entry.label,
      tokens: entry.tokens,
    }));

    return {
      enabled: Boolean(catalog.rootFolder && iconOptions.length),
      source: catalog.source,
      rootFolder: catalog.rootFolder,
      iconOptions,
      optionCount: iconOptions.length,
      folderMemory: (Array.isArray(catalog.folderMemory) ? catalog.folderMemory : []).slice(0, 60),
    };
  }

  function scoreEntry(item, entry, normalizedType) {
    const typeHints = Array.isArray(TYPE_HINTS[normalizedType]) ? TYPE_HINTS[normalizedType] : [];
    const haystackTokens = [
      ...keywordsFromPathOrName(item?.name),
      ...keywordsFromPathOrName(item?.description),
      ...typeHints.map((token) => normalizeScoreToken(token)),
    ];

    let score = scoreByTokenSets(haystackTokens, Array.isArray(entry.tokens) ? entry.tokens : []);

    const lowercaseName = String(item?.name || "").toLowerCase();
    const lowercaseLabel = String(entry.label || "").toLowerCase();
    if (lowercaseName && lowercaseLabel.includes(lowercaseName)) score += 12;

    for (const hint of typeHints) {
      if (lowercaseLabel.includes(hint)) score += 2;
    }

    return score;
  }

  function scoreEntryForQuery(entry, itemType, queryTokens) {
    const typeHints = Array.isArray(TYPE_HINTS[itemType]) ? TYPE_HINTS[itemType] : [];
    const entryTokens = Array.isArray(entry.tokens) ? entry.tokens : [];
    const label = String(entry.label || "").toLowerCase();
    const path = String(entry.path || "").toLowerCase();

    let score = scoreByTokenSets(queryTokens, entryTokens);

    for (const queryToken of queryTokens) {
      if (!queryToken) continue;
      if (label.includes(queryToken) || path.includes(queryToken)) score += 2;
    }

    for (const hint of typeHints) {
      if (label.includes(hint) || path.includes(hint)) score += 1;
    }

    if (entry.source === "compendium") score += COMPENDIUM_SCORE_BOOST;

    return score;
  }

  async function getBestIconForItem(item, normalizedType) {
    const requested = toFilePath(item?.img);
    const catalog = await ensureIconCatalog();

    if (requested) {
      const exact = catalog.entries.find((entry) => entry.path === requested);
      if (exact) return exact.path;
    }

    if (catalog.entries.length > 0) {
      let bestPath = "";
      let bestScore = -1;
      const allEntries = [
        ...(Array.isArray(catalog.entries) ? catalog.entries : []),
        ...(Array.isArray(catalog.compendiumEntries) ? catalog.compendiumEntries : []),
      ];

      for (const entry of allEntries) {
        const score = scoreEntry(item, entry, normalizedType);
        if (score > bestScore) {
          bestScore = score;
          bestPath = entry.path;
        }
      }

      if (bestPath && bestScore > 0) return bestPath;
      if (bestPath) return bestPath;
    }

    return TYPE_FALLBACK_ICON[normalizedType] || TYPE_FALLBACK_ICON.loot;
  }

  function getBestIconForItemFromCache(item, normalizedType) {
    const requested = toFilePath(item?.img);
    const catalog = getCachedCatalog();

    if (requested && catalog?.entries?.some((entry) => entry.path === requested)) {
      return requested;
    }

    const entries = [
      ...(Array.isArray(catalog?.entries) ? catalog.entries : []),
      ...(Array.isArray(catalog?.compendiumEntries) ? catalog.compendiumEntries : []),
    ];
    if (entries.length > 0) {
      let bestPath = "";
      let bestScore = -1;

      for (const entry of entries) {
        const score = scoreEntry(item, entry, normalizedType);
        if (score > bestScore) {
          bestScore = score;
          bestPath = entry.path;
        }
      }

      if (bestPath) return bestPath;
    }

    return TYPE_FALLBACK_ICON[normalizedType] || TYPE_FALLBACK_ICON.loot;
  }

  async function askForBestIcon(item, normalizedType) {
    await ensureIconCatalog();
    return getBestIconForItemFromCache(item, normalizedType);
  }

  async function searchIconIndex({ query, itemType, limit }) {
    const catalog = await ensureIconCatalog();
    const maxResults = Math.max(1, Math.min(25, Math.round(Number(limit) || 10)));
    const queryTokens = tokenizeQuery(query);
    const type = String(itemType || "").trim().toLowerCase();

    const scored = [
      ...(Array.isArray(catalog.entries) ? catalog.entries : []),
      ...(Array.isArray(catalog.compendiumEntries) ? catalog.compendiumEntries : []),
    ]
      .map((entry) => ({
        path: entry.path,
        label: entry.label,
        score: scoreEntryForQuery(entry, type, queryTokens),
        source: entry.source || "file",
      }))
      .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

    return {
      query: String(query || "").trim(),
      itemType: type || null,
      indexedAt: Number(catalog.indexedAt) || 0,
      results: scored.slice(0, maxResults),
    };
  }

  function getMemorySnapshot() {
    return getCachedCatalog();
  }

  return {
    indexAllIcons,
    clearMemory,
    rebuildIconCatalog,
    ensureIconCatalog,
    getMemorySnapshot,
    getIconPromptContext,
    getBestIconForItem,
    getBestIconForItemFromCache,
    askForBestIcon,
    searchIconIndex,
  };
}

export const createIconLibrary = createIconIndexAgent;