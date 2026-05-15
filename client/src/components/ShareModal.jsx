import { useState } from 'react';

const API = '/api';

export default function ShareModal({ doc, users, currentUserId, onClose, onToast }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [loading, setLoading] = useState(false);

  const currentShares = doc.shares || [];
  const sharable = users.filter(u => u.id !== currentUserId && !currentShares.some(s => s.id === u.id));

  const handleShare = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: currentUserId, shareWithId: selectedUserId, role: selectedRole }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onToast(`Shared with ${data.sharedWith.name} as ${selectedRole}`);
      onClose();
    } catch (e) {
      onToast(e.message || 'Share failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (shareUserId, newRole) => {
    try {
      await fetch(`${API}/documents/${doc.id}/share/${shareUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: currentUserId, role: newRole }),
      });
      onToast('Role updated');
      onClose();
    } catch {
      onToast('Failed to update role', 'error');
    }
  };

  const handleRevoke = async (shareUserId, userName) => {
    if (!window.confirm(`Remove ${userName}'s access?`)) return;
    try {
      await fetch(`${API}/documents/${doc.id}/share/${shareUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: currentUserId }),
      });
      onToast(`Removed ${userName}'s access`);
      onClose();
    } catch {
      onToast('Failed to revoke access', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Share Document</h2>
        <p className="modal-subtitle">"{doc.title}"</p>

        {currentShares.length > 0 && (
          <div className="shared-list">
            <div className="shared-list-label">Currently shared with</div>
            {currentShares.map(u => (
              <div key={u.id} className="shared-user-row">
                <div>
                  <div className="shared-user-info">{u.name}</div>
                  <div className="shared-user-email">{u.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    value={u.role || 'editor'}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{ fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid #d0d7de', fontFamily: 'inherit' }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="revoke-btn" onClick={() => handleRevoke(u.id, u.name)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sharable.length > 0 ? (
          <>
            <label className="modal-label">Share with</label>
            <select className="modal-select" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">Select a team member…</option>
              {sharable.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </select>
            <label className="modal-label">Permission</label>
            <select className="modal-select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
              <option value="editor">Editor — can view and edit</option>
              <option value="viewer">Viewer — can view only</option>
            </select>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#6e7781', marginBottom: 16 }}>All team members already have access.</p>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {sharable.length > 0 && (
            <button className="btn btn-primary" onClick={handleShare} disabled={!selectedUserId || loading}>
              {loading ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
