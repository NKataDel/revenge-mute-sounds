(function (exports, metro, common, plugin, ui, storage, assets) {
  "use strict";

  const patcher = (globalThis.vendetta && vendetta.patcher) || (plugin && plugin.patcher) || (globalThis.bunny && bunny.patcher);
  const Toasts = metro?.findByProps?.("open", "close") || metro?.findByProps?.("show") || null;

  const PATCH_KEY = "mute-system-sounds";

  function toast(msg) {
    try {
      if (Toasts?.show) Toasts.show(msg, 1);
      else if (Toasts?.open) Toasts.open({ content: msg, toastDurationMs: 2000 });
    } catch {}
  }

  function patchModule(mod) {
    if (!mod || !patcher) return 0;

    const fns = [
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
    ];

    let n = 0;
    for (const fn of fns) {
      if (typeof mod[fn] === "function") {
        try {
          patcher.instead(PATCH_KEY, mod, fn, () => undefined);
          n++;
        } catch {}
      }
    }
    return n;
  }

  function findAndPatch() {
    let total = 0;

    // Самые частые места
    const tries = [
      () => metro.findByProps?.("playSound", "preloadSound"),
      () => metro.findByProps?.("playSoundpack"),
      () => metro.findByProps?.("playSoundIfEnabled"),
      () => metro.findByProps?.("previewSound"),
      () => metro.findByProps?.("play", "stop"),
    ];

    for (const t of tries) {
      try {
        const m = t();
        if (m) total += patchModule(m);
      } catch {}
    }

    // Иногда лежит по store/name
    const names = ["SoundManager", "SoundPlayer", "Sounds", "AudioManager"];
    for (const n of names) {
      try {
        const m = metro.findByName?.(n, false);
        if (m) total += patchModule(m);
      } catch {}
    }

    return total;
  }

  let patchedCount = 0;

  const index = {
    onLoad: () => {
      patchedCount = findAndPatch();
      if (patchedCount > 0) toast("Системные звуки заглушены 🔇");
      else toast("MuteSystemSounds: не нашёл модуль звуков (нужно допоискать).");
    },
    onUnload: () => {
      try { patcher?.unpatchAll?.(PATCH_KEY); } catch {}
      toast("Системные звуки возвращены 🔊");
    },
  };

  exports.default = index;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;

})({}, bunny.metro, bunny.metro.common, vendetta.plugin, vendetta.ui, vendetta.storage, vendetta.ui.assets);
