/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Schema, SchemaExpressionScopeContext, SchemaOptionsContext } from '@formily/react';
import { isValidElement, useContext } from 'react';

interface Props {
  /**
   * 不使用缓存
   */
  noCache?: boolean;
}

const compileCache = {};

const hasVariable = (source: string) => {
  const reg = /{{.*?}}/g;
  return reg.test(source);
};

const sanitizeExpression = (expression: any) => {
  // 1. 类型检查 - 确保 expression 是字符串
  if (typeof expression !== 'string') {
    // 如果不是字符串，直接返回原值，不进行编译
    return expression;
  }

  // 2. 空值检查
  if (!expression || expression.trim() === '') {
    return expression;
  }

  // 3. 检查是否包含变量语法 {{ }}
  if (!expression.includes('{{')) {
    // 如果没有变量语法，直接返回
    return expression;
  }

  // 4. 扩展白名单 - 包含更多常见的字段属性
  const allowedProperties = [
    // 基础字段
    'id',
    'name',
    'title',
    'value',
    'label',
    'description',
    'type',
    'desc',
    'content',
    'text',
    'richText',
    'markdown',

    // 时间字段
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',

    // 状态字段
    'status',
    'state',
    'enabled',
    'disabled',
    'active',
    'inactive',

    // 排序字段
    'sort',
    'order',
    'priority',
    'weight',

    // 关联字段
    'parentId',
    'parent',
    'children',
    'ancestors',
    'descendants',

    // 其他常见字段
    'code',
    'key',
    'alias',
    'slug',
    'path',
    'url',
    'link',
    'icon',
    'image',
    'avatar',
    'logo',
    'banner',
    'thumbnail',
    'color',
    'size',
    'width',
    'height',
    'length',
    'count',
    'total',
    'min',
    'max',
    'average',
    'sum',
    'percentage',
    'ratio',
  ];

  const allowedFunctions = [
    't',
    'format',
    'concat',
    'join',
    'split',
    'trim',
    'substring',
    'toLowerCase',
    'toUpperCase',
    'replace',
    'match',
    'test',
    'parseInt',
    'parseFloat',
    'Math.abs',
    'Math.round',
    'Math.floor',
    'Math.ceil',
    'Date.now',
    'new Date',
    'getTime',
    'getFullYear',
    'getMonth',
    'getDate',
  ];

  // 5. 检查危险代码模式
  const dangerousPatterns = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /document\./i,
    /window\./i,
    /location\./i,
    /script/i,
    /on\w+\s*=/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /fetch\s*\(/i,
    /XMLHttpRequest/i,
    /localStorage/i,
    /sessionStorage/i,
    /cookie/i,
    /history\./i,
    /navigator\./i,
  ];

  // 检查危险模式
  for (const pattern of dangerousPatterns) {
    if (pattern.test(expression)) {
      console.warn('Security warning: Potentially dangerous expression detected:', expression);
      // 不抛出错误，而是返回安全的默认值
      return `{{ t("Security validation failed") }}`;
    }
  }

  // 6. 提取变量表达式进行检查
  const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  let match;

  while ((match = variableRegex.exec(expression)) !== null) {
    const variableContent = match[1].trim();

    // 检查是否包含函数调用
    if (variableContent.includes('(')) {
      const functionName = variableContent.split('(')[0].trim();
      if (!allowedFunctions.includes(functionName)) {
        console.warn('Security warning: Function not allowed:', functionName);
        return `{{ t("Security validation failed") }}`;
      }
    }

    // 检查属性访问
    const propertyAccess = variableContent.split('.');
    for (const prop of propertyAccess) {
      const cleanProp = prop.trim().split('(')[0].trim();
      if (cleanProp && !allowedProperties.includes(cleanProp) && !allowedFunctions.includes(cleanProp)) {
        // 对于不在白名单中的属性，记录警告但不阻止
        console.warn('Security warning: Property not in whitelist:', cleanProp);
        // 可以选择是否阻止，这里选择允许但记录警告
      }
    }
  }

  return expression;
};

export const useCompile = ({ noCache }: Props = { noCache: false }) => {
  const options = useContext(SchemaOptionsContext);
  const scope = useContext(SchemaExpressionScopeContext);
  return (source: any, ext?: any) => {
    let shouldCompile = false;
    let cacheKey: string;

    // source is i18n, for example: {{ t('Add new') }}
    if (typeof source === 'string' && source.startsWith('{{')) {
      shouldCompile = true;
      cacheKey = source;
    }

    // 🚨 安全验证：在编译前验证表达式
    if (typeof source === 'string' && source.includes('{{')) {
      try {
        const sanitizedSource = sanitizeExpression(source);
        if (sanitizedSource === `{{ t("Security validation failed") }}`) {
          console.warn('Security validation failed for expression:', source);
          return source; // 返回原始内容，不进行编译
        }
      } catch (error) {
        console.error('Security validation failed:', error);
        return source; // 返回原始内容，不进行编译
      }
    }

    // source is Component Object, for example: { 'x-component': "Cascader", type: "array", title: "所属地区(行政区划)" }
    if (source && typeof source === 'object' && !isValidElement(source)) {
      try {
        cacheKey = JSON.stringify(source);
      } catch (e) {
        console.warn('Failed to stringify:', e);
        return source;
      }
      if (compileCache[cacheKey]) return compileCache[cacheKey];
      shouldCompile = hasVariable(cacheKey);
    }

    // source is Array, for example: [{ 'title': "{{ ('Admin')}}", name: 'admin' }, { 'title': "{{ ('Root')}}", name: 'root' }]
    if (Array.isArray(source)) {
      try {
        cacheKey = JSON.stringify(source);
      } catch (e) {
        console.warn('Failed to stringify:', e);
        return source;
      }
      if (compileCache[cacheKey]) return compileCache[cacheKey];
      shouldCompile = hasVariable(cacheKey);
    }

    if (shouldCompile) {
      const mergedScope = { ...options.scope, ...scope, ...ext };
      if (!cacheKey) {
        try {
          return Schema.compile(source, mergedScope);
        } catch (error) {
          console.error('Compilation failed:', error);
          return source;
        }
      }
      try {
        if (noCache) {
          return Schema.compile(source, mergedScope);
        }
        compileCache[cacheKey] = compileCache[cacheKey] || Schema.compile(source, mergedScope);
        return compileCache[cacheKey];
      } catch (e) {
        console.log('useCompile error', source, e);
        return source; // 返回原始内容而不是尝试编译
      }
    }

    // source is: plain object、string、number、boolean、undefined、null
    return source;
  };
};
