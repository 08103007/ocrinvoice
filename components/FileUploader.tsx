"use client";

import { useCallback, useState, DragEvent, ChangeEvent } from "react";
import { Upload, File, X, Image as ImageIcon } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg,.webp";

function getFileIcon(type: string) {
  if (type === "application/pdf") return <File size={24} />;
  return <ImageIcon size={24} />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploader({ onFileSelect, isProcessing }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const validateFile = useCallback((file: File): boolean => {
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Chỉ hỗ trợ PDF, PNG, JPG, WebP");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File quá lớn. Tối đa 10MB.");
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    },
    [validateFile]
  );

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = () => {
    setSelectedFile(null);
    setError("");
  };

  const handleProcess = () => {
    if (selectedFile) onFileSelect(selectedFile);
  };

  return (
    <div className="uploader-container">
      <div
        className={`drop-zone ${dragActive ? "drag-active" : ""} ${selectedFile ? "has-file" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="file-preview">
            <div className="file-info">
              {getFileIcon(selectedFile.type)}
              <div>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{formatSize(selectedFile.size)}</span>
              </div>
            </div>
            <button
              className="file-remove"
              onClick={handleRemove}
              disabled={isProcessing}
              title="Xóa file"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <label className="drop-label">
            <Upload size={40} className="upload-icon" />
            <span className="drop-text">
              Kéo thả file hóa đơn vào đây
            </span>
            <span className="drop-subtext">
              hoặc <strong>click để chọn file</strong>
            </span>
            <span className="drop-formats">PDF, PNG, JPG, WebP — tối đa 10MB</span>
            <input
              type="file"
              accept={ACCEPTED_EXT}
              onChange={handleChange}
              className="file-input"
            />
          </label>
        )}
      </div>

      {error && <div className="uploader-error">{error}</div>}

      {selectedFile && (
        <button
          className="process-button"
          onClick={handleProcess}
          disabled={isProcessing}
        >
          {isProcessing ? "Đang xử lý..." : "🔍 Trích xuất hóa đơn"}
        </button>
      )}
    </div>
  );
}
