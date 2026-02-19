(function (i, _, p, w, S, n) {
  "use strict";

  // В твоём примере "_" = vendetta.metro.common
  const RN = _ && _.ReactNative;
  const NativeModules = RN && RN.NativeModules;
  const DCDSoundManager = NativeModules && NativeModules.DCDSoundManager;

  // если по какой-то причине модуля нет — плагин всё равно не должен падать
  const original = {};
  const METHODS = [
    "play",
    "playWithOptions",
    "playSound",
    "playSoundpack",
    "playLocalSound",
    "prepare",
    "stop"
  ];

  function patch() {
    if (!DCDSoundManager) return false;

    let patched = 0;

    for (const m of METHODS) {
      if (typeof DCDSoundManager[m] === "function") {
        // сохраняем оригинал один раз
        if (!original[m]) original[m] = DCDSoundManager[m];

        // глушим проигрывание (и prepare тоже, чтобы ничего не подготавливалось)
        DCDSoundManager[m] = function () {
          // если хочешь НЕ глушить stop — можно убрать stop из METHODS
          return undefined;
        };

        patched++;
      }
    }

    // Логи (если есть доступ к логам)
    try { console.log("[MuteSystemSounds] patched:", patched, "keys:", Object.keys(DCDSoundManager)); } catch {}
    return patched > 0;
  }

  function unpatch() {
    if (!DCDSoundManager) return;

    for (const m of Object.keys(original)) {
      try { DCDSoundManager[m] = original[m]; } catch {}
    }

    try { console.log("[MuteSystemSounds] unpatched"); } catch {}
  }

  const index = {
    onLoad: () => {
      patch();
    },
    onUnload: () => {
      unpatch();
    }
  };

  i.default = index;
  Object.defineProperty(i, "__esModule", { value: true });
  return i;

})({}, vendetta.metro.common, vendetta.plugin, vendetta.storage, vendetta.ui.assets, vendetta.ui.components);
