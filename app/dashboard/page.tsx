"use client";

import { useState, useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  FileText,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Key,
  Database,
  Trash2,
  RefreshCw,
  Search,
  CloudUpload,
  CheckCircle2,
} from "lucide-react";
import FileUploader, { QueueItem } from "@/components/FileUploader";
import InvoiceTable, { InvoiceData } from "@/components/InvoiceTable";
import ExportButtons from "@/components/ExportButtons";
import ProcessingStatus from "@/components/ProcessingStatus";
import FieldSelector, { ALL_FIELDS } from "@/components/FieldSelector";
import ApiKeyModal from "@/components/ApiKeyModal";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export interface InvoiceResult {
  id: string;
  data: InvoiceData;
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  processedAt: string;
  savedToDb?: boolean;
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
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  // Tabs: 'scan' (quét mới) | 'database' (dữ liệu trên PostgreSQL)
  const [activeTab, setActiveTab] = useState<"scan" | "database">("scan");
  const [dbInvoices, setDbInvoices] = useState<InvoiceResult[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dbExpandedCards, setDbExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("GEMINI_API_KEY");
      setHasCustomKey(Boolean(storedKey));
    }
  }, []);

  // Fetch invoices from PostgreSQL
  const fetchDbInvoices = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (json.success && Array.isArray(json.invoices)) {
        setDbInvoices(json.invoices);
      }
    } catch (err) {
      console.error("Lỗi tải hóa đơn từ PostgreSQL:", err);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "database") {
      fetchDbInvoices();
    }
  }, [activeTab, fetchDbInvoices]);

  // Save an invoice to PostgreSQL
  const saveInvoiceToDb = async (inv: InvoiceResult) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: inv.data,
          fileName: inv.fileName,
        }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error("Lỗi lưu PostgreSQL:", e);
      return false;
    }
  };

  const deleteDbInvoice = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này khỏi cơ sở dữ liệu PostgreSQL?")) return;
    try {
      const res = await fetch(`/api/invoices?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDbInvoices((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Không thể xóa: " + (json.error || "Lỗi"));
      }
    } catch {
      alert("Lỗi khi kết nối đến cơ sở dữ liệu.");
    }
  };

  const toggleCard = (idx: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleDbCard = (id: string) => {
    setDbExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInvoiceUpdate = (index: number, updatedData: InvoiceData) => {
    setResults((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], data: updatedData };
      }
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
      const userApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("GEMINI_API_KEY") || ""
          : "";

      for (let i = 0; i < files.length; i++) {
        setCurrent(i + 1);

        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "processing" } : item
          )
        );

        try {
          const isXml = files[i].name.toLowerCase().endsWith(".xml");
          const formData = new FormData();
          formData.append("file", files[i]);
          if (!isXml) {
            formData.append("fields", selectedFields.join(","));
            if (userApiKey) {
              formData.append("apiKey", userApiKey);
            }
          }

          const endpoint = isXml ? "/api/xml" : "/api/ocr";
          const res = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          const json = await res.json();

          if (!res.ok) {
            throw new Error(json.error || (isXml ? "Đọc file XML thất bại" : "Trích xuất thất bại"));
          }

          const fileUrl = URL.createObjectURL(files[i]);
          const newInvoice: InvoiceResult = {
            id: `inv-${Date.now()}-${i}`,
            data: json.data,
            fileName: files[i].name,
            fileUrl,
            fileType: files[i].type,
            processedAt: new Date().toISOString(),
          };

          // Tự động lưu lên Supabase Database
          const isSaved = await saveInvoiceToDb(newInvoice);
          newInvoice.savedToDb = isSaved;

          newResults.push(newInvoice);

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
        setError("Không trích xuất được hóa đơn nào. Vui lòng kiểm tra API Key hoặc file.");
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
    setActiveTab("scan");
  };

  const showResults = results.length > 0 && status === "done";

  // Filter db invoices by keyword
  const filteredDbInvoices = dbInvoices.filter((inv) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    const seller = String(inv.data?.seller || "").toLowerCase();
    const taxCode = String(inv.data?.taxCode || "").toLowerCase();
    const invoiceNum = String(inv.data?.invoiceNumber || "").toLowerCase();
    const fileName = String(inv.fileName || "").toLowerCase();
    return (
      seller.includes(kw) ||
      taxCode.includes(kw) ||
      invoiceNum.includes(kw) ||
      fileName.includes(kw)
    );
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <FileText size={28} />
          <div>
            <h1>OCR Invoice Pro</h1>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
              Trích xuất Hóa đơn GTGT & Quản lý CSDL PostgreSQL
            </span>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="btn-header-action"
            onClick={() => setIsApiKeyModalOpen(true)}
            title="Cài đặt Gemini API Key"
          >
            <Key size={14} />
            <span>{hasCustomKey ? "API Key: Đã lưu" : "Cài đặt API Key"}</span>
          </button>

          {session?.user?.name && (
            <span className="user-name">
              <User
                size={14}
                style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
              />
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
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <button
            type="button"
            className={`btn-mode ${activeTab === "scan" ? "active-view" : ""}`}
            style={{
              background: activeTab === "scan" ? "var(--primary-600)" : "white",
              color: activeTab === "scan" ? "white" : "var(--gray-700)",
              border: "1px solid var(--border)",
            }}
            onClick={() => setActiveTab("scan")}
          >
            <FileText size={15} /> Quét hóa đơn mới
          </button>

          <button
            type="button"
            className={`btn-mode ${activeTab === "database" ? "active-view" : ""}`}
            style={{
              background: activeTab === "database" ? "var(--primary-600)" : "white",
              color: activeTab === "database" ? "white" : "var(--gray-700)",
              border: "1px solid var(--border)",
            }}
            onClick={() => setActiveTab("database")}
          >
            <Database size={15} /> Cơ sở dữ liệu PostgreSQL {dbInvoices.length > 0 && `(${dbInvoices.length})`}
          </button>
        </div>

        {activeTab === "database" ? (
          <div className="result-section-wrapper">
            {/* Database Toolbar */}
            <div className="batch-summary" style={{ flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
                <div className="search-box-wrapper" style={{ position: "relative", flex: 1 }}>
                  <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} />
                  <input
                    type="text"
                    className="field-input-edit"
                    style={{ paddingLeft: "34px", width: "100%" }}
                    placeholder="Tìm theo Số HĐ, Tên người bán, MST..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-action-tool"
                  onClick={fetchDbInvoices}
                  disabled={loadingDb}
                  title="Làm mới danh sách từ PostgreSQL"
                >
                  <RefreshCw size={14} className={loadingDb ? "spin" : ""} />
                  Làm mới
                </button>
              </div>

              <div className="result-actions">
                {filteredDbInvoices.length > 0 && (
                  <ExportButtons results={filteredDbInvoices} />
                )}
              </div>
            </div>

            {loadingDb ? (
              <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "var(--radius)" }}>
                <RefreshCw size={32} className="spin" style={{ color: "var(--primary-600)", marginBottom: "8px" }} />
                <p style={{ color: "var(--gray-600)" }}>Đang tải hóa đơn từ PostgreSQL...</p>
              </div>
            ) : filteredDbInvoices.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "var(--radius)" }}>
                <Database size={36} style={{ color: "var(--gray-400)", marginBottom: "8px" }} />
                <p style={{ color: "var(--gray-600)" }}>
                  {dbInvoices.length === 0
                    ? "Chưa có hóa đơn nào trong CSDL PostgreSQL. Hãy quét hoặc nhập hóa đơn để tự động lưu."
                    : "Không tìm thấy hóa đơn phù hợp với từ khóa."}
                </p>
              </div>
            ) : (
              <div className="results-list">
                {filteredDbInvoices.map((result) => {
                  const cardKey = result.id;
                  const isExpanded = dbExpandedCards.has(cardKey);
                  return (
                    <div key={cardKey} className="result-card">
                      <div
                        className="result-card-header"
                        onClick={() => toggleDbCard(cardKey)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <div className="result-card-title">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <FileText size={16} style={{ flexShrink: 0 }} />
                          <span className="file-name-text" title={result.fileName}>
                            {result.fileName}
                          </span>
                          {result.data?.invoiceNumber && (
                            <span className="badge-invoice-num">
                              Số: {String(result.data.invoiceNumber)}
                            </span>
                          )}
                          {result.processedAt && (
                            <span className="badge-time">
                              ({new Date(result.processedAt).toLocaleString("vi-VN")})
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-delete-row"
                            onClick={() => deleteDbInvoice(result.id)}
                            title="Xóa hóa đơn khỏi PostgreSQL"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className={`result-card-body ${isExpanded ? "" : "collapsed"}`}>
                        <InvoiceTable
                          data={result.data}
                          fileName={result.fileName}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : !showResults ? (
          <div className="upload-section">
            <div className="section-header">
              <h2>Tải lên Hóa đơn GTGT (Ảnh, PDF hoặc file XML HĐĐT)</h2>
              <p>
                Hỗ trợ đọc hóa đơn giấy (ảnh chụp/scan PDF bằng AI) và file XML Hóa đơn điện tử (TT78/TT32), tự động lưu vào PostgreSQL.
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
                Đã trích xuất thành công <span>{results.length}</span> hóa đơn
              </span>
              <div className="result-actions">
                <ExportButtons results={results} />
                <button
                  className="btn-new"
                  onClick={handleReset}
                  aria-label="Upload hóa đơn mới"
                >
                  <RotateCcw
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 4,
                    }}
                  />
                  Quét hóa đơn mới
                </button>
              </div>
            </div>

            {/* Results Cards */}
            <div className="results-list">
              {results.map((result, idx) => (
                <div key={result.id || idx} className="result-card">
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
                      <span className="file-name-text" title={result.fileName}>
                        {result.fileName}
                      </span>
                      {result.savedToDb && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", background: "#ecfdf5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", marginLeft: "8px" }}>
                          <CheckCircle2 size={12} /> Đã lưu PostgreSQL
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`result-card-body ${expandedCards.has(idx) ? "" : "collapsed"}`}
                  >
                    <InvoiceTable
                      data={result.data}
                      fileUrl={result.fileUrl}
                      fileName={result.fileName}
                      onChange={(updatedData) =>
                        handleInvoiceUpdate(idx, updatedData)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={(key) => setHasCustomKey(Boolean(key))}
      />

      <footer className="app-footer">
        <p>OCR Invoice Pro — Gemini AI + PostgreSQL Database</p>
      </footer>
    </div>
  );
}
