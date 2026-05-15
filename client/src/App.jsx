import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import ShareModal from './components/ShareModal';
import UploadModal from './components/UploadModal';
import VersionHistory from './components/VersionHistory';

const API = '/api';

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`toast ${type}`}>{message}</div>;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);
  const [saveStatus, setSaveStatus] = useState('');

  const showToast = (message, type = 'success') => setToast({ message, type });
  const currentUser = users.find(u => u.id === currentUserId) || null;

  useEffect(() => {
    fetch(`${API}/users`)
      .then(r => r.json())
      .then(data => { setUsers(data); if (data.length > 0) setCurrentUserId(data[0].id); })
      .catch(() => showToast('Failed to load users', 'error'));
  }, []);

  const loadDocs = useCallback(() => {
    if (!currentUserId) return;
    fetch(`${API}/documents?userId=${currentUserId}`)
      .then(r => r.json())
      .then(data => { setOwnedDocs(data.owned || []); setSharedDocs(data.shared || []); })
      .catch(() => showToast('Failed to load documents', 'error'));
  }, [currentUserId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const scheduleSave = useCallback((docId, title, content) => {
    setSaveStatus('Saving…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/documents/${docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, userId: currentUserId }),
        });
        if (!r.ok) throw new Error();
        setSaveStatus('Saved');
        loadDocs();
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('Save failed');
        showToast('Save failed', 'error');
      }
    }, 800);
  }, [currentUserId, loadDocs]);

  const handleContentChange = (content) => {
    if (!activeDoc) return;
    setActiveDoc(prev => ({ ...prev, content }));
    scheduleSave(activeDoc.id, activeDoc.title, content);
  };

  const handleTitleChange = (title) => {
    if (!activeDoc) return;
    setActiveDoc(prev => ({ ...prev, title }));
    scheduleSave(activeDoc.id, title, activeDoc.content);
  };

  const handleNewDoc = async () => {
    try {
      const r = await fetch(`${API}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, title: 'Untitled Document', content: '' }),
      });
      const doc = await r.json();
      loadDocs();
      setActiveDoc({ ...doc, userRole: 'owner' });
      showToast('Document created');
    } catch { showToast('Failed to create document', 'error'); }
  };

  const handleSelectDoc = async (docId) => {
    try {
      const r = await fetch(`${API}/documents/${docId}?userId=${currentUserId}`);
      const doc = await r.json();
      setActiveDoc(doc);
    } catch { showToast('Failed to open document', 'error'); }
  };

  const handleDeleteDoc = async () => {
    if (!activeDoc || !window.confirm(`Delete "${activeDoc.title}"?`)) return;
    try {
      await fetch(`${API}/documents/${activeDoc.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      setActiveDoc(null);
      loadDocs();
      showToast('Document deleted');
    } catch { showToast('Failed to delete document', 'error'); }
  };

  const handleUploadComplete = async ({ title, content }) => {
    try {
      const r = await fetch(`${API}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, title, content: `<p>${content.replace(/\n/g, '</p><p>')}</p>` }),
      });
      const doc = await r.json();
      loadDocs();
      setActiveDoc({ ...doc, userRole: 'owner' });
      setUploadModalOpen(false);
      showToast(`Imported "${title}"`);
    } catch { showToast('Import failed', 'error'); }
  };

  const handleVersionRestore = (restoredDoc) => {
    setActiveDoc(prev => ({ ...prev, ...restoredDoc }));
    loadDocs();
    showToast('Restored to previous version');
  };

  const isOwner = activeDoc && activeDoc.owner_id === currentUserId;
  const userRole = activeDoc?.userRole || (isOwner ? 'owner' : 'editor');

  return (
    <div className="app">
      <Sidebar
        users={users}
        currentUserId={currentUserId}
        onUserChange={(id) => { setCurrentUserId(id); setActiveDoc(null); }}
        ownedDocs={ownedDocs}
        sharedDocs={sharedDocs}
        activeDocId={activeDoc?.id}
        onSelectDoc={handleSelectDoc}
        onNewDoc={handleNewDoc}
        onUpload={() => setUploadModalOpen(true)}
      />

      <main className="main">
        {activeDoc ? (
          <Editor
            doc={activeDoc}
            isOwner={isOwner}
            userRole={userRole}
            saveStatus={saveStatus}
            currentUser={currentUser}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            onShare={() => setShareModalOpen(true)}
            onDelete={handleDeleteDoc}
            onShowHistory={() => setHistoryOpen(true)}
          />
        ) : (
          <div className="empty-state">
            <span style={{ fontSize: 40 }}>📄</span>
            <h2>No document selected</h2>
            <p>Create a new document or select one from the sidebar</p>
            <button className="empty-state-btn" onClick={handleNewDoc}>+ New Document</button>
          </div>
        )}
      </main>

      {shareModalOpen && activeDoc && (
        <ShareModal
          doc={activeDoc}
          users={users}
          currentUserId={currentUserId}
          onClose={() => { setShareModalOpen(false); handleSelectDoc(activeDoc.id); }}
          onToast={showToast}
        />
      )}

      {uploadModalOpen && (
        <UploadModal onClose={() => setUploadModalOpen(false)} onUpload={handleUploadComplete} onToast={showToast} />
      )}

      {historyOpen && activeDoc && (
        <VersionHistory
          doc={activeDoc}
          userId={currentUserId}
          onRestore={handleVersionRestore}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
