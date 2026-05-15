import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEffect, useCallback } from 'react';

function Toolbar({ editor }) {
  if (!editor) return null;

  const btn = (action, label, isActive) => (
    <button
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      onClick={action}
      type="button"
      title={label}
    >
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

export default function Editor({
  doc, isOwner, saveStatus,
  onTitleChange, onContentChange,
  onShare, onDelete,
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: doc.content || '',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        'data-placeholder': 'Start writing…',
      },
    },
    onUpdate({ editor }) {
      onContentChange(editor.getHTML());
    },
  });

  // When doc changes, update editor content
  useEffect(() => {
    if (editor && doc.content !== editor.getHTML()) {
      editor.commands.setContent(doc.content || '', false);
    }
  }, [doc.id]); // only on doc ID change, not every content update

  return (
    <>
      <div className="doc-header">
        <input
          className="doc-title-input"
          value={doc.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Untitled Document"
        />
        <span className="save-status">{saveStatus}</span>
        <div className="doc-header-actions">
          {isOwner && (
            <button className="btn btn-secondary" onClick={onShare}>
              Share
            </button>
          )}
          {!isOwner && (
            <span style={{ fontSize: 12, color: '#6e7781', alignSelf: 'center' }}>
              Shared by {doc.owner?.name || 'someone'}
            </span>
          )}
          {isOwner && (
            <button className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      <Toolbar editor={editor} />

      <div className="editor-scroll">
        <div className="editor-inner">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
