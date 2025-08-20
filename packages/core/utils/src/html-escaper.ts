/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * HTML转义工具
 * 在展示时转义HTML内容，防止XSS攻击
 * 不影响用户输入和存储
 */

/**
 * 转义HTML内容，防止XSS攻击
 * 这是最安全的方法，因为所有HTML标签都会被转义
 */
export function escapeHTML(input: string): string {
  if (!input || typeof input !== 'string') return input;

  const htmlEscapes: Record<string, string> = {
    '{': '&lbrace;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  let escaped = input;
  Object.entries(htmlEscapes).forEach(([char, entity]) => {
    escaped = escaped.replace(new RegExp('\\' + char, 'g'), entity);
  });

  return escaped;
}

/**
 * 安全地渲染HTML内容
 * 如果内容包含HTML标签，则转义；如果是纯文本，则直接显示
 */
export function safeRenderHTML(input: string, allowHTML = true): string {
  if (!input || typeof input !== 'string') return input;

  if (allowHTML) {
    // 如果允许HTML，则只转义危险标签
    return escapeDangerousTags(input);
  } else {
    // 如果不允许HTML，则转义所有HTML
    console.log('NOT allowHTML params. escapeHTML', input);
    return escapeHTML(input);
  }
}

/**
 * 只转义危险的HTML标签，保留安全的HTML
 * 用于富文本等需要保留格式的场景
 */
function escapeDangerousTags(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let escaped = input;

  // 带有优先级顺序处理
  const patterns = [
    { pattern: /<img([^>]*)>/gi, replacement: '&lt;img$1&gt;' },
    { pattern: /<script([^>]*)>([\s\S]*?)<\/script>/gi, replacement: '&lt;script$1&gt;$2&lt;/script&gt;' },
    { pattern: /<iframe([^>]*)>([\s\S]*?)<\/iframe>/gi, replacement: '&lt;iframe$1&gt;$2&lt;/iframe&gt;' },
    { pattern: /<object([^>]*)>([\s\S]*?)<\/object>/gi, replacement: '&lt;object$1&gt;$2&lt;/object&gt;' },
    { pattern: /<embed([^>]*)>/gi, replacement: '&lt;embed$1&gt;' },
    { pattern: /<form([^>]*)>([\s\S]*?)<\/form>/gi, replacement: '&lt;form$1&gt;$2&lt;/form&gt;' },
    { pattern: /(\s*)on(\w+\s*)=(\s*["'][^"']*["'])/gi, replacement: '$1on$2&#61;$3' },
    { pattern: /javascript:/gi, replacement: 'javascript&#58;' },
  ];
  //      { pattern: /{{([^}]*)}}/gi,                         replacement: '&lbrace;&lbrace;$1&rbrace;&rbrace;' };

  patterns.forEach(({ pattern, replacement }) => {
    escaped = escaped.replace(pattern, replacement);
  });

  return escaped;
}
