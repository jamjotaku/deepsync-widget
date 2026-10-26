// ===================================================
// DeepSync HUD — CSV Parser
// Google Sheets CSV をパースして SlideData[] に変換
// ===================================================

import type { SlideData } from '../types';

/** CSV データソース URL (Google Sheets 公開CSV) */
export const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcUDA9Y3c70dZcVHxAS-o51kCMktANMV31Y7pYFfvnhZfDejfntqIZEKmWA7fKPefrEKChGH9MLOj2/pub?gid=925424429&single=true&output=csv';

/**
 * CSVのヘッダーカラム名マッピング
 * 日本語・英語の表記揺れやBOMに対応
 */
const COLUMN_ALIASES: Record<keyof SlideData, string[]> = {
  id: ['id', 'ID'],
  date: ['日付', 'date', 'Date', 'DATE', '日時', '投稿日'],
  character: ['キャラクター', 'character', 'Character', 'メンバー', 'member', '名前', 'name'],
  displayName: ['表示名', 'displayName', 'layer', 'Layer', 'レイヤー', 'コスプレイヤー', 'cosplayer', 'author'],
  imageUrl: ['image', 'imageUrl', 'Image', 'IMAGE', '画像', '画像URL', 'url', 'URL', 'photo'],
  sourceLink: ['link', 'sourceLink', 'Link', 'LINK', 'URL', 'ツイート', 'ポスト', 'x_link'],
  caption: ['caption', 'text', '本文', '説明'],
  avatarUrl: ['avatar', 'avatarUrl', 'アイコン'],
  playlistId: ['playlistId', 'playlist'],
};

/**
 * 1行をパース（カンマ区切り、ダブルクォーテーション対応）
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
  // BOM (\uFEFF) の除去とCRの正規化
  const cleanedText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanedText
    .split('\n')
    .map((line) => line.replace(/\r$/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    console.warn('[CSVParser] CSV contains less than 2 lines');
    return [];
  }

  // ヘッダー行を解析
  const rawHeaders = parseCsvLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const columnIndices: Partial<Record<keyof SlideData, number>> = {};

  // 各フィールドのインデックスを特定
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof SlideData, string[]][]) {
    for (let i = 0; i < rawHeaders.length; i++) {
      const header = rawHeaders[i];
      if (aliases.some((alias) => alias.toLowerCase() === header.toLowerCase())) {
        columnIndices[field] = i;
        break;
      }
    }
  }

  // 必須カラム: imageUrl
  if (columnIndices.imageUrl === undefined) {
    console.error('[CSVParser] Missing imageUrl column. Headers found:', rawHeaders);
    return [];
  }

  // データ行をパース
  const slides: SlideData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);

    const imageUrl = (columnIndices.imageUrl !== undefined ? fields[columnIndices.imageUrl] : '') ?? '';
    // 画像URLが有効でない行はスキップ
    if (!imageUrl || !imageUrl.startsWith('http')) continue;

    const date = (columnIndices.date !== undefined ? fields[columnIndices.date] : '') ?? '';
    const character = (columnIndices.character !== undefined ? fields[columnIndices.character] : '') ?? 'Unknown';
    const displayName = (columnIndices.displayName !== undefined ? fields[columnIndices.displayName] : '') ?? '';
    const sourceLink = (columnIndices.sourceLink !== undefined ? fields[columnIndices.sourceLink] : '') ?? '';

    slides.push({
      id: `csv_${i}`,
      date,
      character,
      displayName,
      imageUrl,
      sourceLink,
    });
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
