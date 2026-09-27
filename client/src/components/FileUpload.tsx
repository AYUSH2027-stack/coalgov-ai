import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud, X } from "lucide-react";

type FileUploadProps = {
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  helper?: string;
  capture?: "environment" | "user";
  onFileReady?: (file: File) => void;
  onRemove?: () => void;
};

const accepted = ["image/png", "image/jpeg", "application/pdf", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export default function FileUpload({ accept = "image/png,image/jpeg,application/pdf", maxSizeMb = 10, label = "Add evidence", helper = "PNG, JPG, or PDF · up to 10 MB", capture, onFileReady, onRemove }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "ready">("idle");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const select = (next?: File) => {
    if (!next) return;
    setError("");
    if (!accepted.includes(next.type)) { setError("Unsupported file type. Choose PNG, JPG, PDF, CSV, or XLSX."); return; }
    if (next.size > maxSizeMb * 1024 * 1024) { setError(`File must be ${maxSizeMb} MB or smaller.`); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
    setStatus("uploading");
    setProgress(8);
    const timer = window.setInterval(() => setProgress(value => {
      if (value >= 100) { window.clearInterval(timer); setStatus("ready"); onFileReady?.(next); return 100; }
      return Math.min(value + 23, 100);
    }), 90);
  };
  const remove = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); setProgress(0); setStatus("idle"); setError(""); if (inputRef.current) inputRef.current.value = ""; onRemove?.(); };
  return <div className="w-full"><div className={`rounded-md border border-dashed p-4 transition-colors ${error ? "border-[#dc2626] bg-[#fff7f7]" : "border-slate-300 bg-white hover:border-[#059669]"}`} onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); select(event.dataTransfer.files[0]); }}><input ref={inputRef} type="file" accept={accept} capture={capture} className="hidden" onChange={event => select(event.target.files?.[0])} />{!file ? <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-md bg-[#ecfdf5] text-[#059669]"><UploadCloud size={17} /></span><span><span className="block text-[12px] font-semibold text-slate-800">{label}</span><span className="mt-1 block text-[10px] text-slate-500">Drag and drop or choose a file · {helper}</span></span></button> : <div className="flex items-center gap-3">{preview ? <img src={preview} alt={file.name} className="h-12 w-12 rounded-md object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-md bg-slate-100 text-slate-500">{file.type.startsWith("image/") ? <ImageIcon size={20} /> : <FileText size={20} />}</span>}<div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold text-slate-800">{file.name}</div><div className="mt-1 text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB · {status === "ready" ? "Ready to submit" : "Processing"}</div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100"><span className="block h-full rounded bg-[#059669] transition-all" style={{ width: `${progress}%` }} /></div></div>{status === "uploading" ? <Loader2 size={16} className="animate-spin text-[#059669]" /> : <button type="button" onClick={remove} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#dc2626]" aria-label="Remove file"><Trash2 size={15} /></button>}<button type="button" onClick={() => inputRef.current?.click()} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">Replace</button></div>}</div>{error && <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#dc2626]"><X size={12} />{error}</div>}</div>;
}
