"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { FileText, LogOut } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import InvoiceTable from "@/components/InvoiceTable";
import ExportButtons from "@/components/ExportButtons";
import ProcessingStatus from "@/components/ProcessingStatus";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function HomePage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = async (file: File) => {
    setStatus("uploading");
    setError("");
    setResult(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setStatus("processing");

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "OCR failed");
      }

      setResult(json.data);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(msg);
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setError("");
    setResult(null);
    setFileName("");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <FileText size={28} />
          <h1>OCR Invoice</h1>
        </div>
        <div className="header-right">
          {session?.user?.name && (
            <span className="user-name">👤 {session.user.name}</span>
          )}
          <button className="btn-logout" onClick={() => signOut()}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-main">
        {!result ? (
          <div className="upload-section">
            <div className="section-header">
              <h2>Tải lên hóa đơn</h2>
              <p>Upload file PDF hoặc ảnh hóa đơn để trích xuất thông tin tự động</p>
            </div>
            <FileUploader
              onFileSelect={handleFileSelect}
              isProcessing={status === "uploading" || status === "processing"}
            />
            <ProcessingStatus status={status} error={error} />
          </div>
        ) : (
          <div className="result-section-wrapper">
            <div className="result-header">
              <div>
                <h2>Kết quả trích xuất</h2>
                <p className="result-filename">📄 {fileName}</p>
              </div>
              <div className="result-actions">
                <ExportButtons data={result} fileName={fileName} />
                <button className="btn-new" onClick={handleReset}>
                  + Hóa đơn mới
                </button>
              </div>
            </div>
            <InvoiceTable data={result as Record<string, unknown> & { items?: Array<Record<string, unknown>> }} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>OCR Invoice App — Powered by Gemini 2.5 Flash AI</p>
      </footer>
    </div>
  );
}
