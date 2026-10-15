import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function ImageUploader({ file, onChange }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function isAcceptedImage(candidate: File) {
    if (ACCEPTED_MIME_TYPES.includes(candidate.type)) return true;
    const name = candidate.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
  }

  function accept(candidate?: File) {
    setValidationError('');
    if (!candidate) return;

    if (!isAcceptedImage(candidate)) {
      setValidationError(t('common.invalidType'));
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setValidationError(t('common.fileTooLarge'));
      return;
    }

    onChange(candidate);
  }

  function openPicker() {
    // Reset first so selecting the same file twice still triggers change.
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }

  function clearFile() {
    onChange(null);
    setValidationError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        aria-label={t('evaluate.upload')}
        onChange={(event) => accept(event.currentTarget.files?.[0])}
      />

      {file && preview ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
            <img
              src={preview}
              className="h-44 w-full object-contain sm:h-48"
              alt="Selected evaluation image preview"
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-start">
              <p className="truncate text-sm font-bold">{file.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'image'}
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={openPicker}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                {t('common.replace')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={clearFile}
                icon={<Trash2 className="h-4 w-4" />}
              >
                {t('common.remove')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            accept(event.dataTransfer.files?.[0]);
          }}
          className={`focus-ring flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 sm:min-h-[200px] sm:p-6 ${
            dragging
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10 dark:bg-blue-950/30'
              : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-violet-50/50 hover:border-blue-500 hover:bg-blue-50/80 dark:border-blue-900 dark:from-blue-950/20 dark:to-violet-950/20'
          }`}
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-card dark:bg-slate-900">
            {dragging ? <ImagePlus className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
          </div>
          <p className="mt-3 font-bold">{t('common.dropImage')}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t('common.browseImage')}</p>
        </button>
      )}

      {validationError && (
        <p role="alert" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-300">
          {validationError}
        </p>
      )}
    </div>
  );
}
