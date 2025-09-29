import { z } from 'zod';

const htmlEscapeMap: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
});

const htmlEscapeRegex = /[&<>"'/]/g;

export const escapeHtml = (value: string): string =>
  value.replace(htmlEscapeRegex, (char) => htmlEscapeMap[char] ?? char);

export const sanitizeText = (value: string): string => escapeHtml(value.trim());

export const digitsOnly = (value: string): string => value.replace(/\D+/g, '');

export const sanitizeEmail = (value: string): string => sanitizeText(value).toLowerCase();

export const optionalStringPreprocess = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((input) => {
    if (input === undefined || input === null) return undefined;
    if (typeof input !== 'string') return input;
    const sanitized = sanitizeText(input);
    return sanitized.length === 0 ? undefined : sanitized;
  }, schema.optional());
