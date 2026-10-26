// ===================================================
// DeepSync HUD — Media Add & Playlist Manager Modal
// FxTwitter API連携によるXポスト画像抽出 & プレイリスト管理
// ===================================================

import React, { useState } from 'react';
import type { Playlist, PlaylistItem } from '../types';
import './MediaAddModal.css';

interface MediaAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist?: (id: string | null) => void;
  onAddUrls: (textInput: string, playlistId: string) => Promise<{ addedCount: number; errors: string[] }>;
  onCreatePlaylist: (name: string, desc?: string) => string | null;
  onDeletePlaylist: (id: string) => void;
  onClearPlaylistItems?: (playlistId: string) => void;
  isProcessing: boolean;
  statusMessage: string | null;
  onDownloadBackup: () => void;
  onRestoreBackup: (jsonStr: string) => { success: boolean; message: string };
  currentItems?: PlaylistItem[];
}

export const MediaAddModal: React.FC<MediaAddModalProps> = ({
  isOpen,
  onClose,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onAddUrls,
  onCreatePlaylist,
  onDeletePlaylist,
  onClearPlaylistItems,
  isProcessing,
  statusMessage,
  onDownloadBackup,
  onRestoreBackup,
  currentItems = [],
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'backup'>('add');
  const [urlInput, setUrlInput] = useState('');
  const [targetPlaylist, setTargetPlaylist] = useState<string>(activePlaylistId || 'default');
  const [resultNotice, setResultNotice] = useState<string | null>(null);

  // 新規プレイリストフォーム用
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultNotice(null);

    try {
      const res = await onAddUrls(urlInput, targetPlaylist);
      if (res.addedCount > 0) {
        setUrlInput('');
        setResultNotice(`✅ ${res.addedCount}枚の画像をプレイリストに追加しました！`);
        // 追加先プレイリストを即座にアクティブ化
        onSelectPlaylist?.(targetPlaylist);
      }
      if (res.errors.length > 0) {
        setResultNotice(`⚠️ 一部失敗: ${res.errors.join(' | ')}`);
      }
    } catch (err) {
      setResultNotice(`❌ エラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const id = onCreatePlaylist(newPlaylistName);
    if (id) {
      setTargetPlaylist(id);
      setNewPlaylistName('');
      setResultNotice(`✅ プレイリスト「${newPlaylistName}」を作成しました`);
      onSelectPlaylist?.(id);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = onRestoreBackup(content);
      setResultNotice(res.success ? `✅ ${res.message}` : `❌ ${res.message}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="hud-modal-header">
          <div className="modal-title">
            <span className="title-icon">🛸</span>
            MEDIA STREAM MANAGER
          </div>
          <button className="modal-close-btn" onClick={onClose} title="閉じる">
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            ＋ X(Twitter)画像登録
          </button>
          <button
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            📁 プレイリスト管理 ({playlists.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            💾 バックアップ / 復元
          </button>
        </div>

        {/* 通知メッセージ */}
        {resultNotice && <div className="modal-notice">{resultNotice}</div>}

        {/* タブ1: Xから追加 */}
        {activeTab === 'add' && (
          <form className="modal-body" onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label">追加先プレイリスト</label>
              <select
                className="hud-input form-select"
                value={targetPlaylist}
                onChange={(e) => setTargetPlaylist(e.target.value)}
              >
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({pl.itemCount}枚)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                X (Twitter) ポストURL
                <span className="label-hint">※改行で複数件まとめて登録可能</span>
              </label>
              <textarea
                className="hud-input form-textarea"
                rows={3}
                placeholder={`https://x.com/creator/status/1880000000000000000\nhttps://twitter.com/creator/status/1880000000000000001`}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="api-badge-info">
              ⚡ FxTwitter API を利用し、公式APIキー不要・高解像度オリジナル画像・投稿者名を自動抽出します（CORSプロキシフォールバック対応）。
            </div>

            {isProcessing && (
              <div className="processing-bar">
                <span className="spinner">⏳</span>
                <span className="processing-text">{statusMessage || '画像データを抽出中...'}</span>
              </div>
            )}

            {/* 登録済み画像のミニプレビュー */}
            {currentItems.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: '#7a8b9e', marginBottom: '4px' }}>
                  登録済みメディア ({currentItems.length}件):
                </div>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {currentItems.slice(0, 8).map((item) => (
                    <img
                      key={item.id}
                      src={item.imageUrl}
                      alt=""
                      style={{
                        width: '42px',
                        height: '42px',
                        objectFit: 'cover',
                        borderRadius: '3px',
                        border: '1px solid rgba(0, 242, 255, 0.3)',
                        flexShrink: 0,
                      }}
                      title={item.authorName}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="hud-btn hud-btn-accent submit-btn"
                disabled={isProcessing || !urlInput.trim()}
              >
                {isProcessing ? '抽出処理中...' : '画像を抽出してプレイリストに追加'}
              </button>
            </div>
          </form>
        )}

        {/* タブ2: プレイリスト管理 */}
        {activeTab === 'manage' && (
          <div className="modal-body">
            {/* 新規作成フォーム */}
            <form className="create-playlist-form" onSubmit={handleCreatePlaylist}>
              <input
                type="text"
                className="hud-input"
                placeholder="新しいプレイリスト名 (例: 推しイラスト)"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
              />
              <button type="submit" className="hud-btn hud-btn-accent">
                作成
              </button>
            </form>

            {/* プレイリスト一覧 */}
            <div className="playlist-list">
              {playlists.map((pl) => (
                <div key={pl.id} className="playlist-row">
                  <div
                    className="pl-info"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onSelectPlaylist?.(pl.id);
                      setResultNotice(`再生プレイリストを「${pl.name}」に設定しました`);
                    }}
                    title="クリックしてこのプレイリストを再生"
                  >
                    <span className="pl-name">
                      {pl.name} {activePlaylistId === pl.id ? '▶ [再生中]' : ''}
                    </span>
                    <span className="pl-count">{pl.itemCount} 枚のメディア</span>
                  </div>
                  <div className="pl-actions" style={{ display: 'flex', gap: '4px' }}>
                    {onClearPlaylistItems && pl.itemCount > 0 && (
                      <button
                        className="hud-btn"
                        style={{ fontSize: '9px', padding: '2px 5px', color: '#ffb700' }}
                        onClick={() => {
                          if (confirm(`「${pl.name}」の画像を全消去しますか？`)) {
                            onClearPlaylistItems(pl.id);
                            setResultNotice(`「${pl.name}」の画像を消去しました`);
                          }
                        }}
                        title="このプレイリスト内の全画像を空にする"
                      >
                        画像を空にする
                      </button>
                    )}
                    {!pl.isDefault && (
                      <button
                        className="hud-btn danger-btn"
                        style={{ fontSize: '9px', padding: '2px 5px' }}
                        onClick={() => onDeletePlaylist(pl.id)}
                        title="プレイリストと登録画像を削除"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タブ3: バックアップ & 復元 */}
        {activeTab === 'backup' && (
          <div className="modal-body backup-tab">
            <div className="backup-card">
              <h4>JSONエクスポート</h4>
              <p>登録したプレイリストと全画像メタデータをJSONファイルとして保存します。</p>
              <button className="hud-btn hud-btn-accent" onClick={onDownloadBackup}>
                📥 バックアップJSONをダウンロード
              </button>
            </div>

            <div className="backup-card">
              <h4>JSONインポート</h4>
              <p>以前保存したバックアップJSONファイルを読み込んで復元します。</p>
              <label className="hud-btn file-upload-btn">
                📤 バックアップファイルを選択
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileImport}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
