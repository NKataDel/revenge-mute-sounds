(function (i, _, p, w, S, n) {
  "use strict";

  // Native Sound Manager (как в твоём рабочем примере)
  const { DCDSoundManager } = _.ReactNative.NativeModules;

  // Patch API (у Vendetta/Revenge обычно есть)
  const patcher = p.patcher || vendetta?.patcher || bunny?.patcher;

  // storage (чтобы можно было выключать)
  const store = p.storage;
  store.enabled ??= true;

  const SOUND_ID_ANY = 6969; // просто id для совместимости, не обязателен

  function patchMethod(obj, name) {
    if (!obj || typeof obj[name] !== "function" || !patcher) return false;

    patcher.instead("mute-system-sounds", obj, name, (args, orig) => {
      if (store.enabled) {
        // глушим все системные звуки
        return undefined;
      }
      return orig(...args);
    });

    return true;
  }

  // UI settings (минимально)
  function Settings() {
    w.useProxy(p.storage);
    return React.createElement(
      n.General.ScrollView,
      { style: { flex: 1 } },
      React.createElement(
        n.Forms.FormSection,
        { title: "Mute System Sounds" },
        React.createElement(n.Forms.FormSwitchRow, {
          label: "Enabled",
          subLabel: "Blocks Discord system sounds (mute/join/leave/deafen, etc.)",
          value: !!store.enabled,
          onValueChange: (v) => (store.enabled = v),
        })
      )
    );
  }

  let patched = 0;

  const index = {
    onLoad: () => {
      // Сначала на всякий — снять старые патчи
      try { patcher?.unpatchAll?.("mute-system-sounds"); } catch {}

      // Патчим разные варианты методов, которые встречаются в разных версиях
      patched = 0;
      patched += patchMethod(DCDSoundManager, "play") ? 1 : 0;
      patched += patchMethod(DCDSoundManager, "playWithOptions") ? 1 : 0;
      patched += patchMethod(DCDSoundManager, "playSound") ? 1 : 0;
      patched += patchMethod(DCDSoundManager, "playSoundpack") ? 1 : 0;
      patched += patchMethod(DCDSoundManager, "playLocalSound") ? 1 : 0;

      // Если ничего не пропатчилось, значит методы иначе называются — тогда нужен дамп ключей.
      // Но в большинстве сборок play(...) есть.
      if (patched === 0) {
        // В эмуляторе тостов может не быть, поэтому просто лог
        try { console.log("[MuteSystemSounds] No methods patched on DCDSoundManager", Object.keys(DCDSoundManager || {})); } catch {}
      } else {
        try { console.log("[MuteSystemSounds] patched methods:", patched); } catch {}
      }
    },

    onUnload: () => {
      try { patcher?.unpatchAll?.("mute-system-sounds"); } catch {}
      try { console.log("[MuteSystemSounds] unpatched"); } catch {}
    },

    settings: Settings,
  };

  i.default = index;
  i.settings = store;
  Object.defineProperty(i, "__esModule", { value: true });
  return i;

})({}, vendetta.metro.common, vendetta.plugin, vendetta.storage, vendetta.ui.assets, vendetta.ui.components);
