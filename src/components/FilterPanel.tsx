// ===================================================
// DeepSync Widget — Filter Panel Component
// メンバー（キャラクター）とレイヤー（表示名）のフィルタ
// ===================================================

import '../styles/settings.css';

interface FilterPanelProps {
  /** ユニークなメンバー（キャラクター）一覧 */
  availableMembers: string[];
  /** ユニークなレイヤー（表示名）一覧 */
  availableLayers: string[];
  /** 現在選択中のメンバー */
  selectedMembers: string[];
  /** 現在選択中のレイヤー */
  selectedLayers: string[];
  onMembersChange: (members: string[]) => void;
  onLayersChange: (layers: string[]) => void;
}

export function FilterPanel({
  availableMembers,
  availableLayers,
  selectedMembers,
  selectedLayers,
  onMembersChange,
  onLayersChange,
}: FilterPanelProps) {
  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      onMembersChange(selectedMembers.filter((m) => m !== member));
    } else {
      onMembersChange([...selectedMembers, member]);
    }
  };

  const toggleLayer = (layer: string) => {
    if (selectedLayers.includes(layer)) {
      onLayersChange(selectedLayers.filter((l) => l !== layer));
    } else {
      onLayersChange([...selectedLayers, layer]);
    }
  };

  const selectAllMembers = () => onMembersChange([...availableMembers]);
  const clearMembers = () => onMembersChange([]);

  const selectAllLayers = () => onLayersChange([...availableLayers]);
  const clearLayers = () => onLayersChange([]);

  return (
    <>
      {/* ── メンバーフィルタ ── */}
      <div className="settings-section">
        <div className="settings-section__title">
          メンバー
          <span style={{ float: 'right', letterSpacing: 'normal' }}>
            <button className="filter-action-btn" onClick={selectAllMembers}>
              全選択
            </button>
            {' / '}
            <button className="filter-action-btn" onClick={clearMembers}>
              解除
            </button>
          </span>
        </div>
        <div className="filter-grid">
          {availableMembers.map((member) => (
            <label key={member} className="filter-chip">
              <input
                type="checkbox"
                className="filter-chip__input"
                checked={selectedMembers.includes(member)}
                onChange={() => toggleMember(member)}
              />
              <span className="filter-chip__label">{member}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── レイヤーフィルタ ── */}
      {availableLayers.length > 1 && (
        <div className="settings-section">
          <div className="settings-section__title">
            レイヤー
            <span style={{ float: 'right', letterSpacing: 'normal' }}>
              <button className="filter-action-btn" onClick={selectAllLayers}>
                全選択
              </button>
              {' / '}
              <button className="filter-action-btn" onClick={clearLayers}>
                解除
              </button>
            </span>
          </div>
          <div className="filter-grid">
            {availableLayers.map((layer) => (
              <label key={layer} className="filter-chip">
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={selectedLayers.includes(layer)}
                  onChange={() => toggleLayer(layer)}
                />
                <span className="filter-chip__label">{layer}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
