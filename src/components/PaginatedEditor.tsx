import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';
import { Node as ProseMirrorNode, DOMSerializer } from 'prosemirror-model';
import debounce from 'lodash.debounce';
// No need for '../index.css' if it's imported in main.tsx or App.tsx

// The fixed height of the content area of one A4 page in pixels.
const PAGE_CONTENT_HEIGHT_PX = 940;

// --- Custom Page Break Node with a React Node View ---
const PageBreakComponent = () => {
  return (
    <NodeViewWrapper as="div" className="page-break">
      <div className="page-break-indicator">Page Break</div>
    </NodeViewWrapper>
  );
};

const PageBreakExtension = TiptapNode.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() { return [{ tag: 'div[data-type="page-break"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent);
  },
  addCommands() {
    return {
      setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name }),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType; };
  }
}
// --- End of Custom Node ---


export const PaginatedEditor = () => {
  const [pageCount, setPageCount] = useState(1);
  const editorContentRef = useRef<HTMLDivElement>(null);

  // --- THIS IS THE NEW, ROBUST CALCULATION LOGIC ---
  const calculateLayout = useCallback((editor: Editor) => {
    // 1. Create a clean, isolated div for measurement.
    const measureDiv = document.createElement('div');
    measureDiv.className = 'prose';
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.width = 'calc(210mm - 4cm)';
    document.body.appendChild(measureDiv);
    
    const { doc, schema } = editor.state;
    const serializer = DOMSerializer.fromSchema(schema);
    let newPageCount = 0;
    
    // 2. Group document nodes into sections based on page breaks.
    const sections: ProseMirrorNode[][] = [];
    let currentSection: ProseMirrorNode[] = [];

    doc.content.forEach((node) => {
      if (node.type.name === 'pageBreak') {
        sections.push(currentSection);
        currentSection = [];
      } else {
        currentSection.push(node);
      }
    });
    sections.push(currentSection);
    
    // 3. Measure each section and calculate pages needed.
    sections.forEach((sectionNodes) => {
      if (sectionNodes.length === 0) {
        newPageCount++; // A manual page break creates a new page
        return;
      }

      measureDiv.innerHTML = ''; // Clear for fresh measurement
      sectionNodes.forEach(node => {
        measureDiv.appendChild(serializer.serializeNode(node));
      });
      
      const sectionHeight = measureDiv.scrollHeight;
      const pagesForSection = Math.ceil(sectionHeight / PAGE_CONTENT_HEIGHT_PX);
      newPageCount += Math.max(1, pagesForSection);
    });
    
    // 4. Clean up and update the state.
    document.body.removeChild(measureDiv);
    setPageCount(Math.max(1, newPageCount));

  }, []);

  const debouncedCalculateLayout = useCallback(debounce(calculateLayout, 150), [calculateLayout]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your document…',
      }),
      PageBreakExtension,
    ],
    content: ``, // Start with a blank canvas
    editorProps: {
      attributes: {
        class: 'prose',
      },
    },
    onUpdate({ editor }) {
      debouncedCalculateLayout(editor);
    },
  });

  // Calculate layout on initial load
  useEffect(() => {
    if (editor) {
      setTimeout(() => calculateLayout(editor), 100);
    }
  }, [editor, calculateLayout]);

  return (
    <div className="app-container">
      <header className="app-toolbar flex items-center">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor?.chain().focus().setPageBreak().run()}>Insert Page Break</button>
        <button onClick={() => window.print()}>Print / Export PDF</button>
      </header>

      <div className="editor-root">
        <div className="editor-viewport">
          {/* Renders the static, visual page backgrounds */}
          <div className="pages">
            {Array.from({ length: pageCount }).map((_, index) => (
              <div key={index} className="page">
                <div className="page-header">Header - Page {index + 1}</div>
                <div className="page-content-area" />
                <div className="page-footer">Footer - Page {index + 1}</div>
              </div>
            ))}
          </div>
          
          {/* Renders the one, single, REAL Tiptap editor that sits on top */}
          <div ref={editorContentRef} className="tiptap-editor-wrapper">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
};