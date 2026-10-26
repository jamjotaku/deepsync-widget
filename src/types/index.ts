// ===================================================
// DeepSync HUD — Type Definitions
// ===================================================

/** スライドショーに使用する1枚分のデータ（CSVまたはプレイリスト共通） */
export interface SlideData {
  /** アイテムID */
  id?: string;
  /** 日付 (YYYY/MM/DD) */
  date: string;
  /** キャラクター名 = UIでは「メンバー」 */
  character: string;
  /** 表示名 = UIでは「レイヤー」または投稿者 */
  displayName: string;
  /** 画像URL */
  imageUrl: string;
  /** 元ポストURL */
  sourceLink: string;
  /** キャプション・本文（任意） */
  caption?: string;
  /** 元投稿者のアバターURL（任意） */
  avatarUrl?: string;
  /** プレイリストID（プレイリスト由来の場合） */
  playlistId?: string;
}

/** ウィジェットサイズプリセット名 */
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'expanded';

/** ウィジェットサイズ定義 */
export const WIDGET_SIZES: Record<WidgetSize, { width: number; height: number; label: string }> = {
  small:    { width: 280, height: 400, label: '小' },
  medium:   { width: 360, height: 520, label: '中' },
  large:    { width: 440, height: 680, label: '大' },
  wide:     { width: 560, height: 360, label: 'ワイド' },
  expanded: { width: 680, height: 760, label: 'ダッシュボード特大' },
};

/** 表示モード */
export type DisplayMode = 'dashboard' | 'nano' | 'ambient';

/** メディアソース種別 */
export type MediaSourceMode = 'playlist' | 'csv' | 'hybrid';

/** プレイリスト情報 */
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  itemCount: number;
  isDefault?: boolean;
}

/** プレイリスト内の1メディアアイテム */
export interface PlaylistItem {
  id: string;
  imageUrl: string;
  sourceLink: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  text?: string;
  createdAt?: string;
  addedAt: number;
  playlistId: string;
}

/** ポモドーロタイマーの動作モード */
export type PomodoroMode = 'focus' | 'break' | 'idle';

/** RSS・SNSフィードアイテム */
export interface FeedItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  badge?: string;
}

/** 外部通知・アラートアイテム */
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  timestamp: number;
  source?: string;
  read: boolean;
}

/** アプリ全体の設定 */
export interface AppSettings {
  /** 表示モード: ダッシュボード / ミニマルNano / アンビエント全画面 */
  displayMode: DisplayMode;
  /** メディアデータソース */
  mediaSourceMode: MediaSourceMode;
  /** 選択中プレイリストID (nullの場合は全件) */
  activePlaylistId: string | null;
  /** ウィジェットサイズ */
  widgetSize: WidgetSize;
  /** 常に最前面表示 */
  alwaysOnTop: boolean;
  /** スライド切替間隔（秒）10〜600 */
  slideInterval: number;
  /** 休憩モード時のスライド間隔（秒） */
  breakSlideInterval: number;
  /** 集中モード時間（分） */
  focusDuration: number;
  /** 休憩モード時間（分） */
  breakDuration: number;
  /** 長休憩モード時間（分） */
  longBreakDuration: number;
  /** 長休憩までのセッション数 */
  sessionsBeforeLongBreak: number;
  /** 選択中メンバー（CSVのキャラクター列） */
  selectedMembers: string[];
  /** 選択中レイヤー（CSVの表示名列） */
  selectedLayers: string[];
  /** シャッフル再生 */
  shuffle: boolean;
}

/** デフォルト設定 */
export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'dashboard',
  mediaSourceMode: 'playlist',
  activePlaylistId: null,
  widgetSize: 'medium',
  alwaysOnTop: true,
  slideInterval: 30,
  breakSlideInterval: 10,
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  selectedMembers: [],
  selectedLayers: [],
  shuffle: true,
};

/** ポモドーロタイマー状態 */
export interface PomodoroState {
  mode: PomodoroMode;
  /** 残り秒数 */
  remainingSeconds: number;
  /** 現在のモードの合計秒数 */
  totalSeconds: number;
  /** 完了済みセッション数 */
  completedSessions: number;
  /** タイマー実行中 */
  isRunning: boolean;
}

/** CSV取得結果 */
export interface CsvDataResult {
  slides: SlideData[];
  /** ユニークなメンバー（キャラクター）一覧 */
  uniqueMembers: string[];
  /** ユニークなレイヤー（表示名）一覧 */
  uniqueLayers: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
