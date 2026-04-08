// ===================================================
// DeepSync Widget — Type Definitions
// ===================================================

/** スライドショーに使用する1枚分のデータ */
export interface SlideData {
  /** 日付 (YYYY/MM/DD) */
  date: string;
  /** キャラクター名 = UIでは「メンバー」 */
  character: string;
  /** 表示名 = UIでは「レイヤー」 */
  displayName: string;
  /** 画像URL */
  imageUrl: string;
  /** 元ツイートURL */
  sourceLink: string;
}

/** ウィジェットサイズプリセット名 */
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

/** ウィジェットサイズ定義 */
export const WIDGET_SIZES: Record<WidgetSize, { width: number; height: number; label: string }> = {
  small:  { width: 240, height: 360, label: '小' },
  medium: { width: 320, height: 480, label: '中' },
  large:  { width: 400, height: 600, label: '大' },
  wide:   { width: 480, height: 270, label: 'ワイド' },
};

/** ポモドーロタイマーの動作モード */
export type PomodoroMode = 'focus' | 'break' | 'idle';

/** アプリ全体の設定 */
export interface AppSettings {
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
}

/** デフォルト設定 */
export const DEFAULT_SETTINGS: AppSettings = {
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
