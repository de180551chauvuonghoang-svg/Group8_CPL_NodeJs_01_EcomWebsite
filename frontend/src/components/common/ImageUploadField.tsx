import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react';
import type { ProductImage } from '../../types';
import { uploadService, type UploadPurpose } from '../../services/uploadService';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface ImageUploadFieldProps {
  label: string;
  purpose: UploadPurpose;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  aspect?: 'square' | 'cover' | 'product';
}

export default function ImageUploadField({
  label,
  purpose,
  images,
  onChange,
  maxImages = 1,
  disabled = false,
  aspect = 'product',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const selectedFiles = Array.from(files).slice(0, Math.max(0, maxImages - images.length));
    const invalidType = selectedFiles.find((file) => !ACCEPTED_TYPES.has(file.type));
    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (invalidType) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (oversized) {
      setError('Mỗi ảnh phải có dung lượng không quá 5 MB.');
      return;
    }
    if (!selectedFiles.length) {
      setError(`Chỉ được tải tối đa ${maxImages} ảnh.`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const uploads = await Promise.all(
        selectedFiles.map((file) => uploadService.uploadImage(file, purpose)),
      );
      const uploadedImages = uploads.map<ProductImage>((upload, index) => ({
        url: upload.url,
        publicId: upload.publicId,
        isPrimary: images.length === 0 && index === 0,
        sortOrder: images.length + index,
      }));
      onChange([...images, ...uploadedImages]);
    } catch (requestError: any) {
      setError(
        requestError?.data?.message ||
          requestError?.response?.data?.message ||
          requestError?.message ||
          'Không thể tải ảnh lên.',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, imageIndex) => imageIndex !== index);
    if (next.length && !next.some((image) => image.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next.map((image, imageIndex) => ({ ...image, sortOrder: imageIndex })));
  };

  const setPrimary = (index: number) => {
    onChange(
      images.map((image, imageIndex) => ({
        ...image,
        isPrimary: imageIndex === index,
        sortOrder: imageIndex,
      })),
    );
  };

  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'cover' ? 'aspect-[8/3]' : 'aspect-[4/3]';

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant">
            JPG, PNG hoặc WebP, tối đa 5 MB · {images.length}/{maxImages}
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading || images.length >= maxImages}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 px-3 text-xs font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Đang tải' : 'Chọn ảnh'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={maxImages > 1}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => void uploadFiles(event.target.files)}
        />
      </div>

      {images.length ? (
        <div
          className={`grid gap-3 ${maxImages === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}
        >
          {images.map((image, index) => (
            <div
              key={`${image.publicId || image.url}-${index}`}
              className="group relative overflow-hidden rounded-md border border-outline-variant bg-surface-container"
            >
              <img
                src={image.url}
                alt={`${label} ${index + 1}`}
                className={`${aspectClass} w-full object-cover`}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-slate-950/70 p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                {maxImages > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${
                      image.isPrimary ? 'bg-amber-400 text-slate-950' : 'bg-white/15 text-white'
                    }`}
                    title="Đặt làm ảnh chính"
                    aria-label="Đặt làm ảnh chính"
                  >
                    <Star size={15} fill={image.isPrimary ? 'currentColor' : 'none'} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-error text-white"
                  title="Bỏ ảnh"
                  aria-label="Bỏ ảnh"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {image.isPrimary && maxImages > 1 && (
                <span className="absolute left-2 top-2 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-bold text-white">
                  Ảnh chính
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={`flex ${aspectClass} w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-outline-variant bg-surface-container/50 text-on-surface-variant transition hover:border-primary/50 hover:text-primary disabled:opacity-50`}
        >
          <ImagePlus size={28} />
          <span className="text-xs font-bold">Tải ảnh từ thiết bị</span>
        </button>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-error">{error}</p>}
    </section>
  );
}
