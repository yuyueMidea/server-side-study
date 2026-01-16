import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

function Preview({ content, theme }) {
    const previewRef = useRef(null);

    useEffect(() => {
        // 配置 marked
        marked.setOptions({
            highlight: function (code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) { }
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
    }, []);

    const renderMarkdown = () => {
        try {
            return { __html: marked.parse(content) };
        } catch (error) {
            return { __html: '<p>渲染错误</p>' };
        }
    };

    return (
        <div className="w-1/2 overflow-y-auto bg-white dark:bg-gray-800">
            <div
                ref={previewRef}
                className="p-6 prose dark:prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100"
                dangerouslySetInnerHTML={renderMarkdown()}
            />
        </div>
    );
}

export default Preview;