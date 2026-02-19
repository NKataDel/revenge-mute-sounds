import definePlugin from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Patcher } from "@api/Patcher";
import { findByProps, findByName } from "@webpack";
import { Toasts } from "@webpack/common";

type AnyObj = Record<string, any>;

const settings = definePluginSettings({
  enabled: {
    type: OptionType.BOOLEAN,
    description: "Глушить все системные звуки Discord (mute/unmute/deafen и т.п.)",
    default: true,
  },
  debugToasts: {
    type: OptionType.BOOLEAN,
    description: "Показывать отладочные тосты (для проверки, что патчи применились)",
    default: false,
  },
});

function safeToast(msg: string) {
  try {
    if (settings.store.debugToasts) Toasts.show?.(msg, 1);
  } catch {}
}

function patchPlayMethods(mod: AnyObj, label: string) {
  if (!mod) return 0;

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
  ];

  let patched = 0;

  for (const fn of candidates) {
    if (typeof mod[fn] === "function") {
      Patcher.instead(label, mod, fn, (args, original) => {
        // Если вдруг хочешь оставить часть звуков — тут можно сделать whitelist по args.
        // Пока глушим всё, когда enabled=true.
        if (settings.store.enabled) return undefined;
        return original(...args);
      });
      patched++;
    }
  }

  return patched;
}

export default definePlugin({
  name: "Mute System Sounds",
  description: "Отключает системные звуки Discord (mute/unmute/deafen/camera on/off и т.п.)",
  authors: [{ name: "you" }],
  settings,

  onStart() {
    let totalPatched = 0;

    // Стратегия 1: найти модуль по props (часто так проще)
    const byProps = [
      findByProps("playSound", "preloadSound"),
      findByProps("playSoundpack"),
      findByProps("playSoundIfEnabled"),
      findByProps("previewSound"),
      findByProps("play", "stop"),
    ].filter(Boolean) as AnyObj[];

    byProps.forEach((m, i) => {
      totalPatched += patchPlayMethods(m, `MuteSystemSounds:props:${i}`);
    });

    // Стратегия 2: попытаться найти по имени (если сборка Discord/мода так экспортирует)
    const byNames = ["SoundManager", "SoundPlayer", "Sounds", "AudioManager"]
      .map((n) => {
        try { return findByName(n, false); } catch { return null; }
      })
      .filter(Boolean) as AnyObj[];

    byNames.forEach((m, i) => {
      totalPatched += patchPlayMethods(m, `MuteSystemSounds:name:${i}`);
    });

    // Итог
    safeToast(`MuteSystemSounds: patched=${totalPatched}`);
    if (totalPatched === 0) {
      Toasts.show?.("MuteSystemSounds: не нашёл sound-модуль. Напиши, какая версия Revenge/Discord.", 1);
    } else {
      Toasts.show?.("Системные звуки заглушены 🔇", 1);
    }
  },

  onStop() {
    Patcher.unpatchAll("MuteSystemSounds");
    Toasts.show?.("Системные звуки возвращены 🔊", 1);
  },
});
