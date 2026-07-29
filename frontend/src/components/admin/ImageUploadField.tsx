import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { uploadService } from '../../services/uploadService';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
}

// Ô chọn ảnh dùng chung cho Admin: tải file lên Cloudinary (lưu trữ ổn định, không lỗi như link ảnh ngoài)
// hoặc vẫn cho dán URL tay nếu muốn.
export default function ImageUploadField({ label, value, onChange, required }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Ảnh vượt quá 4MB, vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setUploading(true);
    setError('');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const url = await uploadService.uploadImage(reader.result as string);
        onChange(url);
      } catch (err: any) {
        setError(err?.message || 'Tải ảnh lên thất bại. Kiểm tra cấu hình Cloudinary ở backend.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  return (
    <div>
      <label className="block text-xs font-bold text-on-surface-variant mb-1">
        {label}
        {required && ' *'}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-surface-container overflow-hidden shrink-0 border border-outline-variant/40 flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={20} className="text-on-surface-variant" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/40 text-primary font-bold text-xs hover:bg-primary/5 disabled:opacity-50 transition-all"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              {uploading ? 'Đang tải lên...' : 'Tải ảnh lên'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-error font-bold hover:underline"
              >
                Xoá ảnh
              </button>
            )}
          </div>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="...hoặc dán URL ảnh sẵn có"
            className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-xs"
          />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
    </div>
  );
}
