import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

function readSessionValue<Value>(key: string, fallback: Value): Value {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? (JSON.parse(stored) as Value) : fallback;
  } catch {
    return fallback;
  }
}

export function useSessionState<Value>(
  key: string,
  initialValue: Value,
): [Value, Dispatch<SetStateAction<Value>>] {
  const [value, setValue] = useState<Value>(() =>
    readSessionValue(key, initialValue),
  );

  const setPersistedValue = useCallback<Dispatch<SetStateAction<Value>>>(
    (nextValue) => {
      setValue((currentValue) => {
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (current: Value) => Value)(currentValue)
            : nextValue;
        try {
          sessionStorage.setItem(key, JSON.stringify(resolvedValue));
        } catch {
          // L'état en mémoire reste fonctionnel si le stockage est indisponible.
        }
        return resolvedValue;
      });
    },
    [key],
  );

  return [value, setPersistedValue];
}
