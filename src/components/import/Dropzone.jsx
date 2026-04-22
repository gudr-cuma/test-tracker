import { useRef, useState } from 'react';
import Button from '../shared/Button.jsx';

const MD_EXTENSIONS = /\.(md|markdown|txt)$/i;

/**
 * Drag-drop + browse file picker. Accepts exactly one markdown-ish file.
 *
 * Props:
 *  - onFile({ md: string, filename: string }) — called after successful read
 *  - onError(message)                         — called on rejection
 *  - disabled
 */
export default function Dropzone({ onFile, onError, disabled = false }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    if (fileList.length > 1) {
      onError?.('Un seul fichier à la fois.');
      return;
    }
    const file = fileList[0];
    if (!MD_EXTENSIONS.test(file.name)) {
      onError?.('Format non supporté. Attendu : .md, .markdown ou .txt.');
      return;
    }
    try {
      const md = await file.text();
      if (!md.trim()) {
        onError?.('Le fichier est vide.');
        return;
      }
      onFile?.({ md, filename: file.name });
    } catch (e) {
      onError?.(`Lecture impossible : ${e.message || e}`);
    }
  }

  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition',
        dragOver && !disabled
          ? 'border-fv-orange bg-fv-orange-light'
          : 'border-fv-border bg-fv-bg-secondary',
        disabled ? 'opacity-60' : 'hover:border-fv-orange/60',
      ].join(' ')}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
    >
      <div aria-hidden="true" className="text-3xl">📄</div>
      <p className="mt-3 text-sm font-medium text-fv-text">
        Glisse un fichier markdown ici
      </p>
      <p className="mt-1 text-xs text-fv-text-secondary">
        ou clique pour le sélectionner — .md, .markdown, .txt
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
      <div className="mt-4">
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Parcourir…
        </Button>
      </div>
    </div>
  );
}
