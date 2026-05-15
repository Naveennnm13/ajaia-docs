import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect, useState, useCallback } from 'react';

const API = '/api';

function htmlToMarkdown(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  function nodeToMd(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const children = Array.from(node.childNodes).map(nodeToMd).join('');
    const tag = node.tagName.toLowerCase();
    if (tag === 'strong' || tag === 'b') return `**${children}**`;
    if (tag === 'em' || tag === 'i') return `*${children}*`;
    if (tag === 'u') return `_${children}_`;
    if (tag === 'h1') return `\n# ${children}\n`;
    if (tag === 'h2') return `\n## ${children}\n`;
    if (tag === 'h3') return `\n### ${children}\n`;
    if (tag === 'p') return `${children}\n`;
    if (tag === 'li') return children;
    if (tag === 'ul') return Array.from(node.querySelectorAll(':scope > li')).map(li => `- ${nodeToMd(li)}`).join('\n') + '\n';
    if (tag === 'ol') return Array.from(node.querySelectorAll(':scope > li')).map((li, i) => `${i + 1}. ${nodeToMd(li)}`).join('\n') + '\n';
    return children;
  }
  return Array.from(doc.body.childNodes).map(nodeToMd).join('').trim();
}

function Toolbar({ editor }) {
  if (!editor) return null;
  const btn = (action, label, isActive) => (
    <button className={`toolbar-btn ${isActive ? 'active' : ''}`} onClick={action} type="button" title={label}>
      {label}
    </button>
  );
  return (
    <div className="toolbar">
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      <div className="toolbar-divider" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div className="toolbar-divider" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      <div className="toolbar-divider" />
      {btn(() => editor.chain().focus().undo().run(), '↩ Undo', false)}
      {btn(() => editor.chain().focus().redo().run(), '↪ Redo', false)}
    </div>
  );
}

function PresenceAvatars({ docId, currentUserId, currentUserName }) {
  const [viewers, setViewers] = useState([]);

  const heartbeat = useCallback(() => {
    fetch(`${API}/presence/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, userName: currentUserName }),
    });
  }, [docId, currentUserId, currentUserName]);

  const poll = useCallback(() => {
    fetch(`${API}/presence/${docId}`)
      .then(r => r.json())
      .then(data => setViewers(data.filter(v => v.id !== currentUserId)))
      .catch(() => {});
  }, [docId, currentUserId]);

  useEffect(() => {
    heartbeat();
    poll();
    const hb = setInterval(heartbeat, 10000);
    const pl = setInterval(poll, 10000);
    return () => {
      clearInterval(hb);
      clearInterval(pl);
      fetch(`${API}/presence/${docId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
    };
  }, [docId, heartbeat, poll, currentUserId]);

  if (viewers.length === 0) return null;

  const colors = ['#58a6ff', '#3fb950', '#f0883e', '#bc8cff', '#ff7b72'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
      <span style={{ fontSize: 11, color: '#6e7781', marginRight: 4 }}>Also viewing:</span>
      {viewers.map((v, i) => (
        <div key={v.id} title={v.name} style={{
          width: 28, height: 28, borderRadius: '50%', background: colors[i % colors.length],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: '#0d1117', flexShrink: 0,
        }}>
          {v.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

export default function Editor({
  doc, isOwner, userRole, saveStatus, currentUser,
  onTitleChange, onContentChange,
  onShare, onDelete, onShowHistory,
}) {
  const isReadOnly = userRole === 'viewer';

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: doc.content || '',
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        'data-placeholder': isReadOnly ? '' : 'Start writing…',
      },
    },
    onUpdate({ editor }) {
      if (!isReadOnly) onContentChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && doc.content !== editor.getHTML()) {
      editor.commands.setContent(doc.content || '', false);
    }
    if (editor) editor.setEditable(!isReadOnly);
  }, [doc.id, isReadOnly]);

  const exportMarkdown = () => {
    const md = htmlToMarkdown(doc.content);
    const blob = new Blob([`# ${doc.title}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="doc-header">
        <input
          className="doc-title-input"
          value={doc.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Untitled Document"
          readOnly={isReadOnly}
          style={isReadOnly ? { cursor: 'default', color: '#6e7781' } : {}}
        />
        <span className="save-status">{saveStatus}</span>
        <div className="doc-header-actions" style={{ display: 'flex', alignItems: 'center' }}>
          {currentUser && (
            <PresenceAvatars
              docId={doc.id}
              currentUserId={currentUser.id}
              currentUserName={currentUser.name}
            />
          )}
          {isReadOnly && (
            <span style={{ fontSize: 12, color: '#6e7781', marginRight: 8, background: '#f0f0f0', padding: '3px 8px', borderRadius: 4 }}>
              👁 View only
            </span>
          )}
          {!isOwner && !isReadOnly && (
            <span style={{ fontSize: 12, color: '#6e7781', alignSelf: 'center', marginRight: 8 }}>
              Shared by {doc.owner?.name}
            </span>
          )}
          <button className="btn btn-secondary" onClick={exportMarkdown} title="Export as Markdown">↓ Export</button>
          {isOwner && <button className="btn btn-secondary" onClick={onShowHistory}>History</button>}
          {isOwner && <button className="btn btn-secondary" onClick={onShare}>Share</button>}
          {isOwner && <button className="btn btn-danger" onClick={onDelete}>Delete</button>}
        </div>
      </div>

      {!isReadOnly && <Toolbar editor={editor} />}

      <div className="editor-scroll">
        <div className="editor-inner">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
