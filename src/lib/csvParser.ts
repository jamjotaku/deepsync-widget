// ===================================================
// DeepSync Widget — CSV Parser
// Google Sheets CSV をパースして SlideData[] に変換
// ===================================================

import type { SlideData } from '../types';

/** CSV データソース URL */
export const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcUDA9Y3c70dZcVHxAS-o51kCMktANMV31Y7pYFfvnhZfDejfntqIZEKmWA7fKPefrEKChGH9MLOj2/pub?gid=925424429&single=true&output=csv';

/**
 * CSVのヘッダーカラム名マッピング
 * CSVカラム名 → SlideDataフィールド
 */
const COLUMN_MAP: Record<string, keyof SlideData> = {
  '日付': 'date',
  'キャラクター': 'character',
  '表示名': 'displayName',
  'image': 'imageUrl',
  'link': 'sourceLink',
};

/**
 * CSVテキストを行ごとに分割しフィールドをパース
 * ダブルクォート内のカンマやCRLFに対応
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * CSV テキスト全体を SlideData[] にパース
 */
export function parseCsv(csvText: string): SlideData[] {
  const lines = csvText
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  // ヘッダー行を解析
  const headers = parseCsvLine(lines[0]);
  const columnIndices: Partial<Record<keyof SlideData, number>> = {};

  headers.forEach((header, index) => {
    const mapped = COLUMN_MAP[header];
    if (mapped) {
      columnIndices[mapped] = index;
    }
  });

  // 必須カラムの確認
  const requiredFields: (keyof SlideData)[] = ['date', 'character', 'displayName', 'imageUrl'];
  for (const field of requiredFields) {
    if (columnIndices[field] === undefined) {
      console.warn(`[CSVParser] Missing required column for "${field}"`);
      return [];
    }
  }

  // データ行をパース
  const slides: SlideData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);

    const date = fields[columnIndices.date!] ?? '';
    const character = fields[columnIndices.character!] ?? '';
    const displayName = fields[columnIndices.displayName!] ?? '';
    const imageUrl = fields[columnIndices.imageUrl!] ?? '';
    const sourceLink = fields[columnIndices.sourceLink!] ?? '';

    // 画像URLが無い行はスキップ
    if (!imageUrl || !imageUrl.startsWith('http')) continue;

    slides.push({ date, character, displayName, imageUrl, sourceLink });
  }

  return slides;
}

/**
 * SlideData配列からユニークな値のリストを抽出
 */
export function extractUniqueValues(slides: SlideData[]) {
  const members = [...new Set(slides.map((s) => s.character).filter(Boolean))].sort();
  const layers = [...new Set(slides.map((s) => s.displayName).filter(Boolean))].sort();
  return { members, layers };
}
