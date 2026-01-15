import { useState, useEffect, useRef, useCallback } from 'react';

function useSpeechRecognition(language = 'zh-CN', continuous = false) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('您的浏览器不支持语音识别功能,请使用 Chrome 或 Edge 浏览器');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPart;
                } else {
                    interimTranscript += transcriptPart;
                }
            }

            if (finalTranscript) {
                finalTranscriptRef.current += finalTranscript;
            }

            setTranscript(finalTranscriptRef.current + interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            let errorMessage = '识别错误';

            switch (event.error) {
                case 'no-speech':
                    errorMessage = '未检测到语音,请重试';
                    break;
                case 'audio-capture':
                    errorMessage = '无法访问麦克风,请检查权限';
                    break;
                case 'not-allowed':
                    errorMessage = '麦克风权限被拒绝,请在浏览器设置中允许访问';
                    break;
                case 'network':
                    errorMessage = '网络错误,语音识别需要网络连接';
                    break;
                default:
                    errorMessage = `识别错误: ${event.error}`;
            }

            setError(errorMessage);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    // 忽略清理错误
                }
            }
        };
    }, [language, continuous]);

    const startListening = useCallback(() => {
        setError(null);
        setTranscript('');
        finalTranscriptRef.current = '';

        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (err) {
                if (err.name === 'InvalidStateError') {
                    try {
                        recognitionRef.current.stop();
                        setTimeout(() => {
                            recognitionRef.current.start();
                        }, 100);
                    } catch (e) {
                        setError('启动识别失败: ' + e.message);
                    }
                } else {
                    setError('启动识别失败: ' + err.message);
                }
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (err) {
                console.error('停止识别失败:', err);
            }
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening
    };
}

export default useSpeechRecognition;