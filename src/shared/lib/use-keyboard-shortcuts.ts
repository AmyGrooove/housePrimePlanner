import { useEffect } from "react";

export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      let shortcutKey = "";
      if (ctrl) shortcutKey += "ctrl+";
      if (shift) shortcutKey += "shift+";
      if (alt) shortcutKey += "alt+";
      shortcutKey += key;

      const handler = shortcuts[shortcutKey];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};
