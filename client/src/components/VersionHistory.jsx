import { useState, useEffect } from 'react';

const API = '/api';

export default function VersionHistory({ doc, userId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    fetch(`${API}/documents/${doc.id}/versions?userId=${userId}`)
      .then(r => r.json())
      .then(data => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [doc.id, userId]);

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore to version ${version.version_number}: "${version.title}"? Current version will be saved first.`)) return;
    setRestoring(version.id);
    try {
      const r = await fetch(`${API}/documents/${doc.id}/versions/${version.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const restored = await r.json();
      onRestore(restored);
      onClose();
    } catch {
      alert('Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const fmt = (dt) => new Date(dt).toLocaleString();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 500 }}>
        <h2>Version History</h2>
        <p className="modal-subtitle">"{doc.title}" — last 20 versions</p>

        {loading && <p style={{ fontSize: 13, color: '#6e7781' }}>Loading…</p>}
        {!loading && versions.length === 0 && (
          <p style={{ fontSize: 13, color: '#6e7781' }}>No saved versions yet. Versions are created on each save.</p>
        )}

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {versions.map((v, i) => (
            <div key={v.id} className="shared-user-row">
              <div>
                <div className="shared-user-info">
                  v{v.version_number} — {v.title}
                  {i === 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#3fb950', background: '#0d2a14', padding: '1px 6px', borderRadius: 10 }}>latest</span>}
                </div>
                <div className="shared-user-email">{fmt(v.saved_at)}</div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => handleRestore(v)}
                disabled={restoring === v.id || i === 0}
              >
                {restoring === v.id ? 'Restoring…' : i === 0 ? 'Current' : 'Restore'}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
