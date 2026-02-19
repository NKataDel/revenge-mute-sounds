(function (exports, metro, common, plugin, ui, storage, assets) {
  "use strict";

  // Если этот код выполняется — ты увидишь ошибку
  throw new Error("TEST: MuteSystemSounds plugin LOADED");

  const index = {
    onLoad: () => {},
    onUnload: () => {}
  };

  exports.default = index;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;

})({}, bunny.metro, bunny.metro.common, vendetta.plugin, vendetta.ui, vendetta.storage, vendetta.ui.assets);
