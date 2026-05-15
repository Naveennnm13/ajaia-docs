import { useState, useRef } from 'react';

const API = '/api';

export default function UploadModal({ onClose, onUpload, onToast }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'md'].includes(ext)) {
      onToast('Only .txt and .md files are supported', 'error');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const r = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onUpload({ title: data.title, content: data.content });
    } catch (e) {
      onToast(e.message || 'Upload failed', 'error');
      setLoading(false);
      setFileName('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Import File</h2>
        <p className="modal-subtitle">Upload a .txt or .md file to create a new document</p>

        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <div className="upload-zone-icon">📁</div>
          {loading ? (
            <div className="upload-zone-text">Importing {fileName}…</div>
          ) : (
            <>
              <div className="upload-zone-text">Drop file here or click to browse</div>
              <div className="upload-zone-hint">Supports .txt and .md files up to 5MB</div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="upload-input"
            accept=".txt,.md"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
