"use client";

import { useCallback, useState, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  File as FileIcon,
  X,
  Image as ImageIcon,
  FolderOpen,
  Files,
  Loader2,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
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
const MAX_FILES = 20;
const MAX_SIZE = 10 * 1024 * 1024;

function getFileIcon(type: string) {
  if (type === "application/pdf") return <FileIcon size={16} />;
  return <ImageIcon size={16} />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type QueueItemStatus = "pending" | "processing" | "done" | "error";

export interface QueueItem {
  file: File;
  status: QueueItemStatus;
  error?: string;
}

interface FileUploaderWithQueueProps extends FileUploaderProps {
  queue: QueueItem[];
}

function StatusIcon({ status }: { status: QueueItemStatus }) {
  switch (status) {
    case "processing":
      return <Loader2 size={14} className="spin" />;
    case "done":
      return <Check size={14} />;
    case "error":
      return <AlertCircle size={14} />;
    default:
      return <Clock size={14} />;
  }
}

const STATUS_LABELS: Record<QueueItemStatus, string> = {
  pending: "Chờ",
  processing: "Xử lý...",
  done: "Xong",
  error: "Lỗi",
};

export default function FileUploader({
  onFilesSelect,
  isProcessing,
  queue,
}: FileUploaderWithQueueProps) {
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<"file" | "folder">("file");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const filterValidFiles = useCallback((files: FileList | File[]): File[] => {
    setError("");
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_SIZE) return false;
      return true;
    });
    if (valid.length === 0) {
      setError("Không tìm thấy file hợp lệ (PDF, PNG, JPG, WebP ≤ 10MB)");
      return [];
    }
    if (valid.length > MAX_FILES) {
      setError(`Tối đa ${MAX_FILES} files. Đã chọn ${valid.length}.`);
      return valid.slice(0, MAX_FILES);
    }
    if (valid.length < arr.length) {
      setError(
        `${arr.length - valid.length} file bị bỏ qua (sai định dạng hoặc quá lớn)`
      );
    }
    return valid;
  }, []);

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
      const files = filterValidFiles(e.dataTransfer.files);
      if (files.length > 0) setSelectedFiles(files);
    },
    [filterValidFiles]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const valid = filterValidFiles(files);
      if (valid.length > 0) setSelectedFiles(valid);
      e.target.value = "";
    },
    [filterValidFiles]
  );

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setError("");
  };

  const handleProcess = () => {
    if (selectedFiles.length > 0) onFilesSelect(selectedFiles);
  };

  const showQueue = queue.length > 0;

  return (
    <div className="uploader-container">
      {/* Mode Toggle */}
      <div className="upload-mode-toggle">
        <button
          className={`toggle-btn ${mode === "file" ? "active" : ""}`}
          onClick={() => setMode("file")}
        >
          <Files size={14} /> Files
        </button>
        <button
          className={`toggle-btn ${mode === "folder" ? "active" : ""}`}
          onClick={() => setMode("folder")}
        >
          <FolderOpen size={14} /> Folder
        </button>
      </div>

      {/* Drop Zone */}
      {!showQueue && (
        <div
          className={`drop-zone ${dragActive ? "drag-active" : ""} ${selectedFiles.length > 0 ? "has-file" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFiles.length > 0 ? (
            <div className="file-preview">
              <div className="file-info">
                <Files size={24} />
                <div>
                  <span className="file-name">
                    {selectedFiles.length} file(s) selected
                  </span>
                  <span className="file-size">
                    {formatSize(
                      selectedFiles.reduce((sum, f) => sum + f.size, 0)
                    )}
                  </span>
                </div>
              </div>
              <button
                className="file-remove"
                onClick={handleClear}
                disabled={isProcessing}
                aria-label="Xóa tất cả files"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="drop-label">
              <Upload size={40} className="upload-icon" />
              <span className="drop-text">
                {mode === "folder"
                  ? "Chọn folder chứa hóa đơn"
                  : "Kéo thả files hóa đơn vào đây"}
              </span>
              <span className="drop-subtext">
                hoặc <strong>click để chọn {mode === "folder" ? "folder" : "files"}</strong>
              </span>
              <span className="drop-formats">
                PDF, PNG, JPG, WebP — tối đa 10MB/file, {MAX_FILES} files
              </span>
              {mode === "folder" ? (
                <input
                  type="file"
                  /* @ts-expect-error webkitdirectory is a non-standard attribute */
                  webkitdirectory=""
                  directory=""
                  onChange={handleChange}
                  className="file-input"
                />
              ) : (
                <input
                  type="file"
                  accept={ACCEPTED_EXT}
                  multiple
                  onChange={handleChange}
                  className="file-input"
                />
              )}
            </label>
          )}
        </div>
      )}

      {/* File List (before processing) */}
      {selectedFiles.length > 1 && !showQueue && (
        <div className="file-queue">
          {selectedFiles.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="queue-item">
              <div className="queue-item-info">
                {getFileIcon(file.type)}
                <span className="queue-item-name">{file.name}</span>
                <span className="queue-item-size">{formatSize(file.size)}</span>
              </div>
              <button
                className="file-remove"
                onClick={() => handleRemoveFile(idx)}
                disabled={isProcessing}
                aria-label={`Xóa ${file.name}`}
                style={{ width: 24, height: 24 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Processing Queue */}
      {showQueue && (
        <div className="file-queue">
          {queue.map((item, idx) => (
            <div
              key={`q-${idx}`}
              className={`queue-item ${item.status}`}
            >
              <div className="queue-item-info">
                {getFileIcon(item.file.type)}
                <span className="queue-item-name">{item.file.name}</span>
                <span className="queue-item-size">
                  {formatSize(item.file.size)}
                </span>
              </div>
              <div className={`queue-item-status status-${item.status === "done" ? "success" : item.status}`}>
                <StatusIcon status={item.status} />
                <span>{item.error || STATUS_LABELS[item.status]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="uploader-error">{error}</div>}

      {selectedFiles.length > 0 && !showQueue && (
        <button
          className="process-button"
          onClick={handleProcess}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="spin" />
              Đang xử lý...
            </>
          ) : (
            `Trích xuất ${selectedFiles.length} hóa đơn`
          )}
        </button>
      )}
    </div>
  );
}
