import React from 'react';
import {
    Bold, Italic, List, ListOrdered, Link, Image, Code,
    Eye, EyeOff, Save, Search, Download, FolderOpen,
    Heading1, Heading2, Maximize2, Minimize2,
    Sun, Moon, Quote, Minus, Table, CheckSquare, FilePlus
} from 'lucide-react';

function Toolbar({
    onOpenFile, onSaveFile, onSaveAs, onExportHTML,
    showPreview, onTogglePreview, theme, onToggleTheme,
    zenMode, onToggleZen, showSearch, onToggleSearch,
    searchTerm, onSearchChange, content, onContentChange,
    isModified
}) {
    const insertMarkdown = (before, after = '', newline = false) => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        const prefix = newline && start > 0 && content[start - 1] !== '\n' ? '\n' : '';
        const newContent =
            content.substring(0, start) +
            prefix + before + selectedText + after +
            content.substring(end);

        onContentChange(newContent);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + prefix.length + before.length;
            textarea.setSelectionRange(newPos, newPos + selectedText.length);
        }, 0);
    };

    const insertTable = () => {
        insertMarkdown('| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据 | 数据 | 数据 |\n', '', true);
    };

    return (
        <>
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 文件操作 */}
                    <button onClick={onOpenFile} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="打开文件 (Ctrl+O)">
                        <FolderOpen size={18} />
                    </button>
                    <button onClick={onSaveFile} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="保存 (Ctrl+S)">
                        <Save size={18} className={isModified ? 'text-blue-600' : ''} />
                    </button>
                    <button onClick={onSaveAs} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="另存为">
                        <FilePlus size={18} />
                    </button>

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                    {/* 格式化工具 */}
                    <button onClick={() => insertMarkdown('# ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="标题1">
                        <Heading1 size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('## ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="标题2">
                        <Heading2 size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('**', '**')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="粗体">
                        <Bold size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('*', '*')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="斜体">
                        <Italic size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('`', '`')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="代码">
                        <Code size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('> ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="引用">
                        <Quote size={18} />
                    </button>

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                    {/* 列表工具 */}
                    <button onClick={() => insertMarkdown('- ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="无序列表">
                        <List size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('1. ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="有序列表">
                        <ListOrdered size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('- [ ] ', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="任务列表">
                        <CheckSquare size={18} />
                    </button>
                    <button onClick={insertTable} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="插入表格">
                        <Table size={18} />
                    </button>

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                    {/* 插入工具 */}
                    <button onClick={() => insertMarkdown('[', '](url)')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="链接">
                        <Link size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('![alt](', ')')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="图片">
                        <Image size={18} />
                    </button>
                    <button onClick={() => insertMarkdown('\n---\n', '', true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="分隔线">
                        <Minus size={18} />
                    </button>

                    <div className="flex-1" />

                    {/* 视图控制 */}
                    <button onClick={onToggleSearch} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="搜索">
                        <Search size={18} />
                    </button>
                    <button onClick={onTogglePreview} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="切换预览">
                        {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>

                    {/* 导出菜单 */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="导出">
                            <Download size={18} />
                        </button>
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg hidden group-hover:block z-10 border dark:border-gray-700">
                            <button onClick={onExportHTML} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm">
                                导出 HTML
                            </button>
                        </div>
                    </div>

                    <button onClick={onToggleZen} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="无干扰模式">
                        {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button onClick={onToggleTheme} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition" title="切换主题">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            {/* 搜索栏 */}
            {showSearch && (
                <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="搜索文档内容..."
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}
        </>
    );
}

export default Toolbar;