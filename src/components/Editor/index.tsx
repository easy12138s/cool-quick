import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { forwardRef, useImperativeHandle } from 'react'
import './editor.css'

interface RichTextEditorProps {
  content?: string
  placeholder?: string
  onChange?: (html: string) => void
  editable?: boolean
}

export interface RichTextEditorRef {
  getHTML: () => string
  getText: () => string
  clear: () => void
  setContent: (content: string) => void
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content = '', placeholder = '开始写作...', onChange, editable = true }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      editable,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      clear: () => editor?.commands.clearContent(),
      setContent: (content: string) => editor?.commands.setContent(content),
    }))

    if (!editor) {
      return null
    }

    return (
      <div className="rich-text-editor">
        {editable && (
          <div className="editor-toolbar">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              title="粗体"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              title="斜体"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'is-active' : ''}
              title="下划线"
            >
              <u>U</u>
            </button>
            <span className="toolbar-divider" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
              title="标题 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              title="标题 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
              title="标题 3"
            >
              H3
            </button>
            <span className="toolbar-divider" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              title="无序列表"
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              title="有序列表"
            >
              1. List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive('codeBlock') ? 'is-active' : ''}
              title="代码块"
            >
              {'</>'}
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'is-active' : ''}
              title="引用"
            >
              "Quote"
            </button>
          </div>
        )}
        <EditorContent editor={editor} className="editor-content" />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'
