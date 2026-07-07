'use client';

import { useRef } from 'react';
import { useCloud } from '../../../context/CloudContext';
import { Asset } from '../../../types';

export function useGridSelection() {
  const {
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    spacesSubTab,
  } = useCloud();

  const suppressClickRef = useRef<string | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_MS = 420;

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const togglePick = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  };

  const beginLongPress = (id: string) => {
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      suppressClickRef.current = id;
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, LONG_PRESS_MS);
  };

  const endLongPress = () => {
    clearLongPress();
  };

  const spaceCardHandlers = (spaceId: string, onNormalClick?: () => void) => {
    return {
      onMouseDown: () => beginLongPress(spaceId),
      onMouseUp: endLongPress,
      onMouseLeave: endLongPress,
      onTouchStart: () => beginLongPress(spaceId),
      onTouchEnd: endLongPress,
      onClick: () => {
        if (suppressClickRef.current === spaceId) {
          suppressClickRef.current = null;
          return;
        }
        if (selectionMode || spacesSubTab === 'trash') {
          if (!selectionMode) setSelectionMode(true);
          togglePick(spaceId);
        } else {
          onNormalClick?.();
        }
      },
    };
  };

  const cardHandlers = (item: Asset, onNormalClick?: () => void) => {
    return {
      onMouseDown: () => beginLongPress(item.id),
      onMouseUp: endLongPress,
      onMouseLeave: endLongPress,
      onTouchStart: () => beginLongPress(item.id),
      onTouchEnd: endLongPress,
      onClick: () => {
        if (suppressClickRef.current === item.id) {
          suppressClickRef.current = null;
          return;
        }
        if (selectionMode) {
          togglePick(item.id);
        } else {
          onNormalClick?.();
        }
      },
    };
  };

  return {
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    togglePick,
    cardHandlers,
    spaceCardHandlers,
  };
}
