import { useEffect, useRef } from 'react';
import { debounce } from '../utils/helpers';

interface UseAutoSaveOptions {
  enabled: boolean;
  delay: number;
  onSave: () => void | Promise<void>;
}

export function useAutoSave({ enabled, delay, onSave }: UseAutoSaveOptions) {
  const debouncedSave = useRef(
    debounce(async () => {
      await onSave();
    }, delay)
  ).current;

  useEffect(() => {
    if (enabled) {
      return () => {
        // 清理时执行最后一次保存
        debouncedSave();
      };
    }
  }, [enabled, debouncedSave]);

  return debouncedSave;
}
