export default function Sidebar({
  users, currentUserId, onUserChange,
  ownedDocs, sharedDocs, activeDocId,
  onSelectDoc, onNewDoc, onUpload,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Ajaia <span>Docs</span></div>
        <select
          className="user-selector"
          value={currentUserId || ''}
          onChange={e => onUserChange(e.target.value)}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <button className="sidebar-new-btn" onClick={onNewDoc}>
          + New Document
        </button>

        <div className="sidebar-section-label">My Documents</div>
        {ownedDocs.length === 0 && (
          <div className="sidebar-empty">No documents yet</div>
        )}
        {ownedDocs.map(doc => (
          <div
            key={doc.id}
            className={`doc-item ${activeDocId === doc.id ? 'active' : ''}`}
            onClick={() => onSelectDoc(doc.id)}
          >
            <span className="doc-item-icon">📄</span>
            <span className="doc-item-title">{doc.title}</span>
          </div>
        ))}

        {sharedDocs.length > 0 && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>Shared with Me</div>
            {sharedDocs.map(doc => (
              <div
                key={doc.id}
                className={`doc-item ${activeDocId === doc.id ? 'active' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <span className="doc-item-icon">🔗</span>
                <span className="doc-item-title">{doc.title}</span>
                <span className="doc-item-badge shared">shared</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-footer-btn" onClick={onUpload}>
          ↑ Import File
        </button>
      </div>
    </aside>
  );
}
