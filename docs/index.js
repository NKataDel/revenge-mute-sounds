(function (exports, metro, common, plugin, ui, storage, assets) {
  "use strict";

  const patcher = (globalThis.vendetta && vendetta.patcher) || (plugin && plugin.patcher) || (globalThis.bunny && bunny.patcher);
  const Toasts = metro?.findByProps?.("show") || metro?.findByProps?.("open", "close") || null;

  const PATCH_KEY = "mute-system-sounds";

  const FN_NAMES = new Set([
    "playSound",
    "playSoundpack",
    "play",
    "playAsync",
    "playEffect",
    "playUISound",
    "playSystemSound",
    "playLocalSound",
    "playSoundIfEnabled",
    "previewSound",
    "enqueueSound",
    "playClip",
    "playSFX",
    "playFX",
    "triggerSound",
  ]);

  function toast(msg) {
    try {
      if (Toasts?.show) Toasts.show(msg, 1);
      else if (Toasts?.open) Toasts.open({ content: msg, toastDurationMs: 2500 });
    } catch {}
  }

  function patchObject(obj) {
    if (!obj || !patcher) return 0;

    let n = 0;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "function" && (FN_NAMES.has(key) || /sound|audio|sfx|fx|tone|ring|beep/i.test(key))) {
        try {
          patcher.instead(PATCH_KEY, obj, key, () => undefined);
          n++;
        } catch {}
      }
    }
    return n;
  }

  function patchModuleExports(mod) {
    if (!mod) return 0;
    let n = 0;

    // export = function/object
    if (typeof mod === "function") return 0;
    if (typeof mod === "object") {
      n += patchObject(mod);
      // default export
      if (mod.default && typeof mod.default === "object") n += patchObject(mod.default);
    }
    return n;
  }

  function findAndPatchTargeted() {
    let total = 0;

    const tries = [
      () => metro.findByProps?.("playSound", "preloadSound"),
      () => metro.findByProps?.("playSoundpack"),
      () => metro.findByProps?.("playSoundIfEnabled"),
      () => metro.findByProps?.("previewSound"),
      () => metro.findByProps?.("play", "stop"),
      () => metro.findByProps?.("playFX"),
      () => metro.findByProps?.("playSFX"),
    ];

    for (const t of tries) {
      try {
        const m = t();
        if (m) total += patchModuleExports(m);
      } catch {}
    }

    const names = ["SoundManager", "SoundPlayer", "Sounds", "AudioManager", "DCDSoundManager"];
    for (const nm of names) {
      try {
        const m = metro.findByName?.(nm, false);
        if (m) total += patchModuleExports(m);
      } catch {}
    }

    return total;
  }

  function findAndPatchByScan(limit) {
    // Полный перебор metro.modules (если доступно).
    // limit — чтобы не зависнуть на старых устройствах.
    let total = 0;
    let scanned = 0;

    const mods = metro?.modules;
    if (!mods) return { total: 0, scanned: 0, supported: false };

    try {
      // mods может быть Map/объект/массив
      const iter =
        typeof mods.forEach === "function"
          ? (cb) => mods.forEach((v) => cb(v))
          : Array.isArray(mods)
          ? (cb) => mods.forEach(cb)
          : (cb) => Object.values(mods).forEach(cb);

      iter((m) => {
        if (limit && scanned >= limit) return;
        scanned++;

        // разные формы: { publicModule: {exports} } или { exports } или сам exports
        const exp =
          m?.publicModule?.exports ??
          m?.exports ??
          m;

        if (exp && (typeof exp === "object" || typeof exp === "function")) {
          // Быстрый фильтр: не патчим всё подряд — только если есть подозрительные ключи
          const keys = typeof exp === "object" ? Object.keys(exp) : [];
          const looksLikeSound =
            keys.some((k) => FN_NAMES.has(k) || /sound|audio|sfx|fx|tone|ring|beep/i.test(k)) ||
            (exp.default && typeof exp.default === "object" && Object.keys(exp.default).some((k) => FN_NAMES.has(k) || /sound|audio|sfx|fx|tone|ring|beep/i.test(k)));

          if (looksLikeSound) total += patchModuleExports(exp);
        }
      });
    } catch {}

    return { total, scanned, supported: true };
  }

  let patchedCount = 0;

  const index = {
    onLoad: () => {
      try { patcher?.unpatchAll?.(PATCH_KEY); } catch {}

      const targeted = findAndPatchTargeted();
      const scanRes = findAndPatchByScan(2500); // при желании можно увеличить

      patchedCount = targeted + scanRes.total;

      toast(`MuteSystemSounds: patched=${patchedCount} (scan:${scanRes.supported ? scanRes.scanned : "no"})`);

      // Если patched=0 — значит звук может проигрываться вообще не из JS (нативно/иначе)
    },
    onUnload: () => {
      try { patcher?.unpatchAll?.(PATCH_KEY); } catch {}
      toast("MuteSystemSounds: off");
    },
  };

  exports.default = index;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;

})({}, bunny.metro, bunny.metro.common, vendetta.plugin, vendetta.ui, vendetta.storage, vendetta.ui.assets);
