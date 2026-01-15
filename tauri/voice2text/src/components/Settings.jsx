import React from 'react';
import { Info, Keyboard } from 'lucide-react';

function SettingsPanel({ settings, onSettingsChange }) {
    const handleChange = (key, value) => {
        onSettingsChange({
            ...settings,
            [key]: value
        });
    };

    return (
        <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <Info size={24} className="text-indigo-600" />
                    设置
                </h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        识别语言
                    </label>
                    <select
                        value={settings.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    >
                        <option value="zh-CN">中文(简体)</option>
                        <option value="zh-TW">中文(繁体)</option>
                        <option value="en-US">英语(美国)</option>
                        <option value="en-GB">英语(英国)</option>
                        <option value="ja-JP">日语</option>
                        <option value="ko-KR">韩语</option>
                        <option value="fr-FR">法语</option>
                        <option value="de-DE">德语</option>
                        <option value="es-ES">西班牙语</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        选择要识别的语言,不同浏览器对语言的支持程度可能不同
                    </p>
                </div>

                <div className="mb-6">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={settings.autoCopy}
                                onChange={(e) => handleChange('autoCopy', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            录音结束后自动复制到剪贴板
                        </span>
                    </label>
                    <p className="mt-1 ml-14 text-xs text-gray-500">
                        开启后,录音停止时会自动将文本复制到剪贴板
                    </p>
                </div>

                <div className="mb-6">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={settings.continuous}
                                onChange={(e) => handleChange('continuous', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            连续识别模式
                        </span>
                    </label>
                    <p className="mt-1 ml-14 text-xs text-gray-500">
                        开启后不会因为停顿而自动停止录音,适合录制长文本
                    </p>
                </div>

                <hr className="my-6 border-gray-200" />

                <div className="p-4 bg-indigo-50 rounded-lg">
                    <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                        <Keyboard size={20} />
                        快捷键
                    </h3>
                    <div className="space-y-2 text-sm text-indigo-700">
                        <div className="flex items-center justify-between">
                            <span>唤醒/隐藏窗口</span>
                            <kbd className="px-2 py-1 bg-white rounded border border-indigo-200 font-mono text-xs">
                                Ctrl + Shift + Space
                            </kbd>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">💡 使用提示</h3>
                    <ul className="space-y-1 text-sm text-yellow-800">
                        <li>• 首次使用需要授予麦克风权限</li>
                        <li>• 推荐使用 Chrome 或 Edge 浏览器</li>
                        <li>• 语音识别需要网络连接</li>
                        <li>• 在安静环境下录音效果更好</li>
                    </ul>
                </div>

                <div className="mt-6 text-center text-xs text-gray-400">
                    <p>语音转文本应用 v1.0.0</p>
                    <p className="mt-1">基于 Tauri + React 构建</p>
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;