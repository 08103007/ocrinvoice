"use client";

import { Download, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";

interface InvoiceResult {
  data: Record<string, unknown>;
  fileName: string;
}

interface ExportButtonsProps {
  results: InvoiceResult[];
}

export default function ExportButtons({ results }: ExportButtonsProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExcel = async () => {
    setDownloading(true);
    try {
      const body =
        results.length === 1
          ? { data: results[0].data, fileName: results[0].fileName }
          : { invoices: results };

      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        results.length === 1
          ? results[0].fileName.replace(/\.[^.]+$/, "") + "_OCR.xlsx"
          : `batch_${results.length}_invoices_OCR.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Lỗi khi xuất Excel. Vui lòng thử lại.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyJSON = async () => {
    try {
      const exportData =
        results.length === 1 ? results[0].data : results.map((r) => r.data);
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Không thể copy. Vui lòng thử lại.");
    }
  };

  return (
    <div className="export-buttons">
      <button
        className="btn-export btn-excel"
        onClick={handleExcel}
        disabled={downloading}
        aria-label="Tải file Excel"
      >
        {downloading ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <Download size={16} />
        )}
        {downloading
          ? "Đang tạo..."
          : results.length > 1
            ? `Tải Excel (${results.length} HĐ)`
            : "Tải Excel"}
      </button>

      <button
        className="btn-export btn-copy"
        onClick={handleCopyJSON}
        aria-label="Copy JSON"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Đã copy!" : "Copy JSON"}
      </button>
    </div>
  );
}
