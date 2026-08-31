'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createParticipantId,
  FORTUNE_WHEEL_STORAGE_KEY,
  type FortuneWheelParticipant,
  type FortuneWheelSpinResult,
} from '@/lib/tools/fortune-wheel';

type StoredFortuneWheelState = {
  participants: FortuneWheelParticipant[];
  nextColorIndex: number;
  lastResult: FortuneWheelSpinResult | null;
};

const defaultState: StoredFortuneWheelState = {
  participants: [],
  nextColorIndex: 0,
  lastResult: null,
};

function readStoredState(): StoredFortuneWheelState {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(FORTUNE_WHEEL_STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<StoredFortuneWheelState>;

    return {
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      nextColorIndex:
        typeof parsed.nextColorIndex === 'number' ? parsed.nextColorIndex : 0,
      lastResult:
        parsed.lastResult && typeof parsed.lastResult === 'object'
          ? parsed.lastResult
          : null,
    };
  } catch {
    return defaultState;
  }
}

function writeStoredState(state: StoredFortuneWheelState): void {
  window.localStorage.setItem(FORTUNE_WHEEL_STORAGE_KEY, JSON.stringify(state));
}

export function useFortuneWheelState() {
  const [participants, setParticipants] = useState<FortuneWheelParticipant[]>([]);
  const [nextColorIndex, setNextColorIndex] = useState(0);
  const [lastResult, setLastResult] = useState<FortuneWheelSpinResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredState();
    setParticipants(stored.participants);
    setNextColorIndex(stored.nextColorIndex);
    setLastResult(stored.lastResult);
    setIsHydrated(true);
  }, []);

  const persist = useCallback(
    (
      nextParticipants: FortuneWheelParticipant[],
      nextColorIndexValue: number,
      nextResult: FortuneWheelSpinResult | null,
    ) => {
      writeStoredState({
        participants: nextParticipants,
        nextColorIndex: nextColorIndexValue,
        lastResult: nextResult,
      });
    },
    [],
  );

  const addParticipant = useCallback(
    (name: string, tickets: number) => {
      const trimmedName = name.trim();
      if (!trimmedName || tickets < 1) {
        return false;
      }

      let created = false;

      setParticipants((current) => {
        const participant: FortuneWheelParticipant = {
          id: createParticipantId(),
          name: trimmedName,
          tickets,
          colorIndex: nextColorIndex,
        };
        const next = [...current, participant];
        persist(next, nextColorIndex + 1, lastResult);
        created = true;
        return next;
      });
      setNextColorIndex((current) => current + 1);
      return created;
    },
    [lastResult, nextColorIndex, persist],
  );

  const updateParticipantTickets = useCallback(
    (participantId: string, tickets: number) => {
      if (tickets < 1) {
        return;
      }

      setParticipants((current) => {
        const next = current.map((participant) =>
          participant.id === participantId
            ? { ...participant, tickets }
            : participant,
        );
        persist(next, nextColorIndex, lastResult);
        return next;
      });
    },
    [lastResult, nextColorIndex, persist],
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      setParticipants((current) => {
        const next = current.filter((participant) => participant.id !== participantId);
        const nextResult =
          lastResult?.winnerId === participantId ? null : lastResult;
        setLastResult(nextResult);
        persist(next, nextColorIndex, nextResult);
        return next;
      });
    },
    [lastResult, nextColorIndex, persist],
  );

  const saveSpinResult = useCallback(
    (result: FortuneWheelSpinResult | null) => {
      setLastResult(result);
      setParticipants((current) => {
        persist(current, nextColorIndex, result);
        return current;
      });
    },
    [nextColorIndex, persist],
  );

  return {
    participants,
    lastResult,
    isHydrated,
    addParticipant,
    updateParticipantTickets,
    removeParticipant,
    saveSpinResult,
  };
}
