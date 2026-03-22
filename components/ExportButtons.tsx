"use client";

import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ExportButtonsProps {
  data: Record<string, unknown>;
  fileName: string;
}

export default function ExportButtons({ data, fileName }: ExportButtonsProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, fileName }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.[^.]+$/, "") + "_OCR.xlsx";
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
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
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
      >
        <Download size={16} />
        {downloading ? "Đang tạo..." : "Tải Excel"}
      </button>

      <button className="btn-export btn-copy" onClick={handleCopyJSON}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Đã copy!" : "Copy JSON"}
      </button>
    </div>
  );
}
