(function () {
  // Попытка достать API Revenge из глобалов (разные сборки — разные имена)
  const rv =
    globalThis.revenge ??
    globalThis.Revenge ??
    globalThis.vendetta ??
    globalThis.Vendetta ??
    globalThis.bunny ??
    globalThis.Bunny;

  if (!rv) {
    // Нечего патчить, но хотя бы не падаем
    console.log("[MuteSystemSounds] Revenge API not found");
    return;
  }

  const { plugins, metro, webpack } = rv;

  // На разных сборках это может лежать по-разному
  const definePlugin = plugins?.definePlugin ?? plugins?.definePlugin?.default;
  const Patcher = plugins?.patcher ?? plugins?.Patcher ?? rv.patcher;
  const Toasts = webpack?.common?.Toasts ?? metro?.common?.Toasts;

  // Функции поиска модулей
  const findByProps =
    webpack?.findByProps ??
    metro?.findByProps ??
    rv.findByProps;

  const findByName =
    webpack?.findByName ??
    metro?.findByName ??
    rv.findByName;

  function toast(msg) {
    try {
      Toasts?.show?.(msg, 1);
    } catch {}
  }

  // Уникальный ключ, чтобы можно было unpatchAll
  const PATCH_KEY = "MuteSystemSounds";

  function patchPlayMethods(mod) {
    if (!mod || !Patcher) return 0;

    const candidates = [
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

    let patched = 0;

    for (const fn of candidates) {
      if (typeof mod[fn] === "function") {
        try {
          Patcher.instead(PATCH_KEY, mod, fn, () => undefined);
          patched++;
        } catch {}
      }
    }

    return patched;
  }

  const plugin = {
    name: "Mute System Sounds",
    description: "Отключает системные звуки Discord (mute/unmute/deafen/camera on/off и т.п.)",
    authors: [{ name: "NKataDel" }],

    onStart() {
      let total = 0;

      const tries = [
        () => findByProps?.("playSound", "preloadSound"),
        () => findByProps?.("playSoundpack"),
        () => findByProps?.("playSoundIfEnabled"),
        () => findByProps?.("previewSound"),
        () => findByProps?.("play", "stop"),
      ];

      for (const t of tries) {
        try {
          const m = t();
          if (m) total += patchPlayMethods(m);
        } catch {}
      }

      const names = ["SoundManager", "SoundPlayer", "Sounds", "AudioManager"];
      for (const n of names) {
        try {
          const m = findByName?.(n, false);
          if (m) total += patchPlayMethods(m);
        } catch {}
      }

      if (total > 0) toast("Системные звуки заглушены 🔇");
      else toast("MuteSystemSounds: модуль звуков не найден (нужно подстроить поиск).");
    },

    onStop() {
      try {
        Patcher?.unpatchAll?.(PATCH_KEY);
      } catch {}
      toast("Системные звуки возвращены 🔊");
    },
  };

  // Экспорт для разных загрузчиков
  if (typeof module !== "undefined" && module.exports) module.exports = plugin;
  else globalThis.__revenge_plugin__ = plugin;

  // Если есть definePlugin — оборачиваем
  if (typeof definePlugin === "function") {
    const wrapped = definePlugin(plugin);
    if (typeof module !== "undefined" && module.exports) module.exports = wrapped;
    else globalThis.__revenge_plugin__ = wrapped;
  }
})();
