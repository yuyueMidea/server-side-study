import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

const useAutoSave = (delay = 2000) => {
  const { currentContent, currentFile, saveFile } = useStore();
  const timeoutRef = useRef(null);
  const previousContentRef = useRef(currentContent);

  useEffect(() => {
    // 如果没有当前文件，不保存
    if (!currentFile) {
      return;
    }

    // 如果内容没有变化，不保存
    if (currentContent === previousContentRef.current) {
      return;
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      saveFile();
      previousContentRef.current = currentContent;
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentContent, currentFile, saveFile, delay]);

  return null;
};

export default useAutoSave;
