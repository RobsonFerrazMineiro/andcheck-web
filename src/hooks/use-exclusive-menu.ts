"use client";

import { useCallback, useEffect, useId } from "react";

const EXCLUSIVE_MENU_EVENT = "andcheck:exclusive-menu-open";

type ExclusiveMenuEvent = CustomEvent<string>;

export function useExclusiveMenu(
  open: boolean,
  setOpen: (value: boolean | ((current: boolean) => boolean)) => void,
) {
  const menuId = useId();

  useEffect(() => {
    function handleExclusiveMenu(event: Event) {
      const nextOpenMenu = (event as ExclusiveMenuEvent).detail;
      if (nextOpenMenu !== menuId) {
        setOpen(false);
      }
    }

    window.addEventListener(EXCLUSIVE_MENU_EVENT, handleExclusiveMenu);
    return () => {
      window.removeEventListener(EXCLUSIVE_MENU_EVENT, handleExclusiveMenu);
    };
  }, [menuId, setOpen]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(
      new CustomEvent(EXCLUSIVE_MENU_EVENT, { detail: menuId }),
    );
  }, [menuId, open]);

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current);
  }, [setOpen]);

  const openMenu = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  return { openMenu, toggleMenu };
}
