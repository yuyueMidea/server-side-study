import { useState, useCallback } from 'react';
import { convertFile, downloadFile } from '../utils/converters';
import { generateId, getOutputFileName } from '../utils/fileUtils';

export function useFileConverter() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [error, setError] = useState(null);

  const convertFileHandler = useCallback(async (fileInfo, targetFormat) => {
    setIsConverting(true);
    setProgress(0);
    setError(null);
    
    const startTime = Date.now();
    
    try {
      // 执行转换
      const result = await convertFile(
        fileInfo.file,
        fileInfo.extension,
        targetFormat,
        setProgress
      );
      
      const duration = Date.now() - startTime;
      const outputFileName = getOutputFileName(fileInfo.name, result.extension);
      
      // 下载文件
      downloadFile(result.blob, outputFileName);
      
      // 添加到历史记录
      const historyRecord = {
        id: generateId(),
        fileName: fileInfo.name,
        sourceFormat: fileInfo.extension,
        targetFormat: result.extension,
        fileSize: fileInfo.size,
        timestamp: new Date(),
        duration,
        status: 'success',
      };
      
      setConversionHistory(prev => [historyRecord, ...prev]);
      
      return {
        success: true,
        outputFileName,
      };
    } catch (err) {
      console.error('转换失败:', err);
      
      // 添加失败记录到历史
      const historyRecord = {
        id: generateId(),
        fileName: fileInfo.name,
        sourceFormat: fileInfo.extension,
        targetFormat,
        fileSize: fileInfo.size,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        error: err.message || '未知错误',
      };
      
      setConversionHistory(prev => [historyRecord, ...prev]);
      setError(err.message || '转换失败，请重试');
      
      return {
        success: false,
        error: err.message,
      };
    } finally {
      setIsConverting(false);
      setProgress(0);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setConversionHistory([]);
  }, []);

  return {
    isConverting,
    progress,
    conversionHistory,
    convertFile: convertFileHandler,
    clearHistory,
    error,
    setError,
  };
}
