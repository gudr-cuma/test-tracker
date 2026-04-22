import { useRef, useState } from 'react';
import Button from '../shared/Button.jsx';

const ACCEPTED_EXTENSIONS = /\.(md|markdown|txt|xlsx)$/i;

/**
 * Drag-drop + browse file picker. Accepts one markdown or Excel file.
 *
 * Props:
 *  - onFile({ md?, buffer?, filename, type: 'md'|'xlsx' }) — after successful read
 *  - onError(message)
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
    if (!ACCEPTED_EXTENSIONS.test(file.name)) {
      onError?.('Format non supporté. Attendu : .md, .markdown, .txt ou .xlsx.');
      return;
    }
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        onFile?.({ buffer, filename: file.name, type: 'xlsx' });
      } else {
        const md = await file.text();
        if (!md.trim()) {
          onError?.('Le fichier est vide.');
          return;
        }
        onFile?.({ md, filename: file.name, type: 'md' });
      }
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
        Glisse un fichier ici
      </p>
      <p className="mt-1 text-xs text-fv-text-secondary">
        ou clique pour le sélectionner — .md, .markdown, .txt, .xlsx
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,.txt,.xlsx,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
