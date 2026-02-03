import { marked } from 'marked';
import TurndownService from 'turndown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// ============== PDF.js 加载 ==============
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  const pdfjs = await import('pdfjs-dist');
  const workerSrc = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc.default;

  pdfjsLib = pdfjs;
  return pdfjsLib;
}

// ============== Turndown 配置 ==============
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// 添加表格支持
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content, node) {
    return '\n\n' + content + '\n\n';
  }
});

// ============== 基础文件读取 ==============

export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    // 明确指定 UTF-8 编码
    reader.readAsText(file, 'UTF-8');
  });
}

export async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// ============== PDF 读取（支持中文） ==============

export async function readPdfText(file) {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await readFileAsArrayBuffer(file);

  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // 保留段落结构
    let lastY = null;
    let pageText = '';

    for (const item of textContent.items) {
      if (!item.str) continue;

      // 检测换行（Y 坐标变化较大时认为是新行）
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }

      pageText += item.str;
      lastY = item.transform[5];
    }

    if (pageText.trim()) {
      fullText += pageText.trim() + '\n\n';
    }
  }

  return fullText.trim();
}

// ============== DOCX 读取 ==============

export async function readDocxAsHtml(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.convertToHtml({
    arrayBuffer,
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='标题 1'] => h1:fresh",
      "p[style-name='标题 2'] => h2:fresh",
      "p[style-name='标题 3'] => h3:fresh",
      "b => strong",
      "i => em",
      "u => u",
      "strike => s",
    ]
  });
  return result.value;
}

export async function docxToText(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ============== Markdown 转换 ==============

export function markdownToHtml(markdown, standalone = true) {
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
  });

  const htmlContent = marked.parse(markdown);

  if (!standalone) return htmlContent;

  return createHtmlDocument(htmlContent, '转换文档');
}

// ============== HTML 工具函数 ==============

function createHtmlDocument(bodyContent, title = '转换文档') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    h1 { font-size: 28px; font-weight: 600; margin: 30px 0 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { font-size: 22px; font-weight: 600; margin: 25px 0 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    h3 { font-size: 18px; font-weight: 600; margin: 20px 0 12px; }
    h4 { font-size: 16px; font-weight: 600; margin: 18px 0 10px; }
    h5, h6 { font-size: 14px; font-weight: 600; margin: 15px 0 8px; }
    p { margin: 12px 0; text-align: justify; }
    ul, ol { margin: 12px 0; padding-left: 28px; }
    li { margin: 6px 0; }
    blockquote { 
      margin: 15px 0; 
      padding: 12px 20px; 
      border-left: 4px solid #ddd; 
      background: #f9f9f9; 
      color: #666; 
    }
    code { 
      font-family: "JetBrains Mono", Consolas, "Courier New", monospace;
      background: #f4f4f4; 
      padding: 2px 6px; 
      border-radius: 3px; 
      font-size: 13px;
    }
    pre { 
      background: #f4f4f4; 
      padding: 15px; 
      border-radius: 5px; 
      overflow-x: auto; 
      margin: 15px 0;
    }
    pre code { background: none; padding: 0; }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 15px 0;
      font-size: 13px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 10px 12px; 
      text-align: left; 
    }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; margin: 15px 0; }
    hr { border: none; border-top: 1px solid #eee; margin: 25px 0; }
    strong, b { font-weight: 600; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export function htmlToMarkdown(html) {
  // 提取 body 内容
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;

  return turndownService.turndown(content);
}

export function htmlToText(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // 移除不需要的元素
  temp.querySelectorAll('script, style, noscript').forEach(el => el.remove());

  // 处理各种元素的换行
  const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'blockquote', 'pre'];
  blockElements.forEach(tag => {
    temp.querySelectorAll(tag).forEach(el => {
      el.insertAdjacentText('afterend', '\n\n');
    });
  });

  temp.querySelectorAll('br').forEach(el => {
    el.replaceWith('\n');
  });

  // 处理列表
  temp.querySelectorAll('li').forEach(el => {
    el.insertAdjacentText('afterbegin', '• ');
  });

  let text = temp.textContent || '';

  // 清理多余空行
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

// ============== TXT 转换 ==============

export function txtToMarkdown(text) {
  const lines = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('');
      continue;
    }

    // 检测可能的标题（短行、全大写或中文标题特征）
    const isShortLine = trimmed.length < 50;
    const isAllCaps = /^[A-Z\s]+$/.test(trimmed);
    const isChineseTitle = /^第[一二三四五六七八九十]+[章节部分]/.test(trimmed) ||
      /^[一二三四五六七八九十]+[、.]/.test(trimmed);

    if (isShortLine && (isAllCaps || isChineseTitle)) {
      result.push(`## ${trimmed}`);
    }
    // 检测列表项
    else if (/^[\d]+[.、)]\s*/.test(trimmed)) {
      result.push(trimmed.replace(/^[\d]+[.、)]\s*/, '1. '));
    }
    else if (/^[-•·]\s*/.test(trimmed)) {
      result.push(trimmed.replace(/^[-•·]\s*/, '- '));
    }
    else {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}

export function txtToHtml(text) {
  // 转义 HTML 特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 分段处理
  const paragraphs = escaped.split(/\n\n+/);
  const htmlContent = paragraphs
    .filter(p => p.trim())
    .map(para => {
      // 保留段内换行
      const formatted = para.trim().replace(/\n/g, '<br>');
      return `<p>${formatted}</p>`;
    })
    .join('\n');

  return createHtmlDocument(htmlContent);
}

// ============== PDF 生成（支持中文） ==============

async function htmlToPdfBlob(htmlContent) {
  // 创建隐藏的渲染容器
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 800px;
    background: white;
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  `;
  document.body.appendChild(container);

  try {
    // 等待字体和图片加载
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用 html2canvas 渲染
    const canvas = await html2canvas(container, {
      scale: 2, // 提高清晰度
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 创建 PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;
    let page = 1;

    // 添加第一页
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - margin * 2);

    // 添加后续页面
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);
      page++;
    }

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

export async function textToPdf(text) {
  const htmlContent = txtToHtml(text);
  return await htmlToPdfBlob(htmlContent);
}

export async function markdownToPdf(markdown) {
  const htmlContent = markdownToHtml(markdown);
  return await htmlToPdfBlob(htmlContent);
}

export async function htmlToPdf(html) {
  // 如果不是完整的 HTML 文档，包装一下
  if (!html.includes('<html')) {
    html = createHtmlDocument(html);
  }
  return await htmlToPdfBlob(html);
}

export async function docxToPdf(file) {
  const html = await readDocxAsHtml(file);
  const fullHtml = createHtmlDocument(html);
  return await htmlToPdfBlob(fullHtml);
}

// ============== DOCX 生成（支持中文） ==============

export async function textToDocx(text) {
  const lines = text.split('\n');
  const children = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }

    // Markdown 标题
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      children.push(new Paragraph({
        children: [new TextRun({ text: headingText, bold: true, size: 32 - level * 2 })],
        heading: level === 1 ? HeadingLevel.HEADING_1 :
          level === 2 ? HeadingLevel.HEADING_2 :
            HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }));
      continue;
    }

    // 数字列表
    if (/^\d+[.、)]\s/.test(trimmed)) {
      const listText = trimmed.replace(/^\d+[.、)]\s*/, '');
      children.push(new Paragraph({
        children: [new TextRun({ text: listText })],
        bullet: { level: 0 },
        indent: { left: 720 },
      }));
      continue;
    }

    // 无序列表
    if (/^[-•·*]\s/.test(trimmed)) {
      const listText = trimmed.replace(/^[-•·*]\s*/, '');
      children.push(new Paragraph({
        children: [new TextRun({ text: '• ' + listText })],
        indent: { left: 720 },
      }));
      continue;
    }

    // 普通段落 - 处理加粗和斜体
    const runs = parseTextRuns(trimmed);
    children.push(new Paragraph({
      children: runs,
      spacing: { after: 200 },
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children.length > 0 ? children : [new Paragraph({ text: '' })],
    }],
  });

  return await Packer.toBlob(doc);
}

// 解析文本中的格式标记
function parseTextRuns(text) {
  const runs = [];
  let remaining = text;

  // 简单处理：直接返回纯文本
  // 如果需要更复杂的格式解析，可以扩展此函数
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*(.+?)\*/g;

  let lastIndex = 0;
  let match;

  // 处理加粗
  const parts = [];
  let tempText = text;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    parts.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false });
  }

  if (parts.length === 0) {
    parts.push({ text: text, bold: false });
  }

  return parts.map(part => new TextRun({
    text: part.text,
    bold: part.bold,
  }));
}

export async function htmlToDocx(html) {
  const text = htmlToText(html);
  return await textToDocx(text);
}

export async function markdownToDocx(markdown) {
  // 保留 Markdown 格式转换
  return await textToDocx(markdown);
}

// ============== 文件预览 ==============

export async function getFilePreview(file, extension) {
  const maxPreviewLength = 3000;

  try {
    let text = '';

    switch (extension) {
      case 'txt':
        text = await readFileAsText(file);
        break;
      case 'md':
      case 'markdown':
        text = await readFileAsText(file);
        break;
      case 'html':
      case 'htm':
        const htmlContent = await readFileAsText(file);
        text = htmlToText(htmlContent);
        break;
      case 'pdf':
        text = await readPdfText(file);
        break;
      case 'docx':
      case 'doc':
        text = await docxToText(file);
        break;
      default:
        return { type: 'unsupported', content: '暂不支持预览此文件类型' };
    }

    if (!text || !text.trim()) {
      return { type: 'empty', content: '（文件内容为空或无法提取文本）' };
    }

    const truncated = text.length > maxPreviewLength;
    return {
      type: 'text',
      content: truncated
        ? text.substring(0, maxPreviewLength) + '\n\n... (内容过长，已截断显示)'
        : text,
    };
  } catch (error) {
    console.error('预览加载失败:', error);
    return {
      type: 'error',
      content: `预览加载失败: ${error.message}\n\n请尝试直接转换文件。`
    };
  }
}

// ============== 主转换函数 ==============

export async function convertFile(file, sourceFormat, targetFormat, onProgress) {
  onProgress?.(5);

  const src = sourceFormat.toLowerCase();
  const tgt = targetFormat.toLowerCase();

  // 读取源文件内容
  let textContent = '';
  let htmlContent = '';

  onProgress?.(10);

  try {
    switch (src) {
      case 'txt':
        textContent = await readFileAsText(file);
        htmlContent = txtToHtml(textContent);
        break;

      case 'md':
      case 'markdown':
        textContent = await readFileAsText(file);
        htmlContent = markdownToHtml(textContent);
        break;

      case 'html':
      case 'htm':
        htmlContent = await readFileAsText(file);
        textContent = htmlToText(htmlContent);
        break;

      case 'pdf':
        textContent = await readPdfText(file);
        htmlContent = txtToHtml(textContent);
        break;

      case 'docx':
      case 'doc':
        textContent = await docxToText(file);
        htmlContent = await readDocxAsHtml(file);
        htmlContent = createHtmlDocument(htmlContent);
        break;

      default:
        throw new Error(`不支持的源格式: ${sourceFormat}`);
    }
  } catch (error) {
    throw new Error(`读取文件失败: ${error.message}`);
  }

  onProgress?.(40);

  // 执行转换
  let result;
  let mimeType;
  let extension = tgt;

  try {
    switch (tgt) {
      case 'txt':
        result = textContent;
        mimeType = 'text/plain;charset=utf-8';
        break;

      case 'md':
        if (src === 'md' || src === 'markdown') {
          result = textContent;
        } else if (src === 'html' || src === 'htm') {
          result = htmlToMarkdown(htmlContent);
        } else {
          result = txtToMarkdown(textContent);
        }
        mimeType = 'text/markdown;charset=utf-8';
        break;

      case 'html':
        if (src === 'html' || src === 'htm') {
          result = htmlContent;
        } else if (src === 'md' || src === 'markdown') {
          result = markdownToHtml(textContent);
        } else if (src === 'docx' || src === 'doc') {
          result = htmlContent;
        } else {
          result = txtToHtml(textContent);
        }
        mimeType = 'text/html;charset=utf-8';
        break;

      case 'pdf':
        onProgress?.(50);
        if (src === 'docx' || src === 'doc') {
          result = await docxToPdf(file);
        } else if (src === 'md' || src === 'markdown') {
          result = await markdownToPdf(textContent);
        } else if (src === 'html' || src === 'htm') {
          result = await htmlToPdf(htmlContent);
        } else {
          result = await textToPdf(textContent);
        }
        mimeType = 'application/pdf';
        break;

      case 'docx':
        onProgress?.(50);
        if (src === 'md' || src === 'markdown') {
          result = await markdownToDocx(textContent);
        } else if (src === 'html' || src === 'htm') {
          result = await htmlToDocx(htmlContent);
        } else {
          result = await textToDocx(textContent);
        }
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;

      default:
        throw new Error(`不支持的目标格式: ${targetFormat}`);
    }
  } catch (error) {
    throw new Error(`转换失败: ${error.message}`);
  }

  onProgress?.(90);

  // 创建 Blob（确保正确的编码）
  let blob;
  if (result instanceof Blob) {
    blob = result;
  } else if (typeof result === 'string') {
    // 文本内容使用 UTF-8 BOM 确保中文正确显示
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const textBlob = new Blob([bom, result], { type: mimeType });
    blob = textBlob;
  } else {
    blob = new Blob([result], { type: mimeType });
  }

  onProgress?.(100);

  return { blob, mimeType, extension };
}

// ============== 文件下载 ==============

export function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // 延迟清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}