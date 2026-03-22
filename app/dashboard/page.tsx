"use client";

import { useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { FileText, LogOut, User, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import FileUploader, { QueueItem } from "@/components/FileUploader";
import InvoiceTable from "@/components/InvoiceTable";
import ExportButtons from "@/components/ExportButtons";
import ProcessingStatus from "@/components/ProcessingStatus";
import FieldSelector, { ALL_FIELDS } from "@/components/FieldSelector";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

interface InvoiceResult {
  data: Record<string, unknown>;
  fileName: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<InvoiceResult[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0]));
  const [selectedFields, setSelectedFields] = useState<string[]>(
    ALL_FIELDS.map((f) => f.key)
  );

  const toggleCard = (idx: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleFilesSelect = useCallback(
    async (files: File[]) => {
      setStatus("processing");
      setError("");
      setResults([]);
      setTotal(files.length);
      setCurrent(0);

      const initialQueue: QueueItem[] = files.map((f) => ({
        file: f,
        status: "pending" as const,
      }));
      setQueue(initialQueue);

      const newResults: InvoiceResult[] = [];

      for (let i = 0; i < files.length; i++) {
        setCurrent(i + 1);

        // Update queue status
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "processing" } : item
          )
        );

        try {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("fields", selectedFields.join(","));

          const res = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json.error || "OCR failed");
          }

          newResults.push({ data: json.data, fileName: files[i].name });

          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "done" } : item
            )
          );
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Lỗi không xác định";

          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "error", error: msg } : item
            )
          );
        }
      }

      if (newResults.length > 0) {
        setResults(newResults);
        setExpandedCards(new Set([0]));
        setStatus("done");
      } else {
        setError("Không trích xuất được hóa đơn nào");
        setStatus("error");
      }
    },
    [selectedFields]
  );

  const handleReset = () => {
    setStatus("idle");
    setError("");
    setResults([]);
    setQueue([]);
    setCurrent(0);
    setTotal(0);
  };

  const showResults = results.length > 0 && status === "done";

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <FileText size={28} />
          <h1>OCR Invoice</h1>
        </div>
        <div className="header-right">
          {session?.user?.name && (
            <span className="user-name">
              <User size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {session.user.name}
            </span>
          )}
          <button
            className="btn-logout"
            onClick={() => signOut()}
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-main">
        {!showResults ? (
          <div className="upload-section">
            <div className="section-header">
              <h2>Tải lên hóa đơn</h2>
              <p>
                Upload files PDF hoặc ảnh hóa đơn (hỗ trợ nhiều file & folder)
              </p>
            </div>

            <FieldSelector
              selectedFields={selectedFields}
              onFieldsChange={setSelectedFields}
            />

            <FileUploader
              onFilesSelect={handleFilesSelect}
              isProcessing={status === "processing" || status === "uploading"}
              queue={queue}
            />

            <ProcessingStatus
              status={status}
              error={error}
              current={current}
              total={total}
            />
          </div>
        ) : (
          <div className="result-section-wrapper">
            {/* Batch Summary */}
            <div className="batch-summary">
              <span className="batch-summary-text">
                Đã trích xuất <span>{results.length}</span> hóa đơn
              </span>
              <div className="result-actions">
                <ExportButtons results={results} />
                <button
                  className="btn-new"
                  onClick={handleReset}
                  aria-label="Upload hóa đơn mới"
                >
                  <RotateCcw size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  Hóa đơn mới
                </button>
              </div>
            </div>

            {/* Results Cards */}
            <div className="results-list">
              {results.map((result, idx) => (
                <div key={idx} className="result-card">
                  <div
                    className="result-card-header"
                    onClick={() => toggleCard(idx)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedCards.has(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleCard(idx);
                    }}
                  >
                    <div className="result-card-title">
                      {expandedCards.has(idx) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                      <FileText size={16} />
                      <span>{result.fileName}</span>
                    </div>
                  </div>
                  <div
                    className={`result-card-body ${expandedCards.has(idx) ? "" : "collapsed"}`}
                  >
                    <InvoiceTable
                      data={
                        result.data as Record<string, unknown> & {
                          items?: Array<Record<string, unknown>>;
                        }
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>OCR Invoice App — Powered by Gemini 2.5 Flash AI</p>
      </footer>
    </div>
  );
}
