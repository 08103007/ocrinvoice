"use client";

import { Loader2 } from "lucide-react";

interface ProcessingStatusProps {
  status: "idle" | "uploading" | "processing" | "done" | "error";
  error?: string;
}

const STATUS_MAP = {
  idle: { text: "", icon: null },
  uploading: { text: "Đang tải file lên...", icon: <Loader2 size={20} className="spin" /> },
  processing: { text: "AI đang phân tích hóa đơn...", icon: <Loader2 size={20} className="spin" /> },
  done: { text: "Hoàn tất! ✅", icon: null },
  error: { text: "Có lỗi xảy ra", icon: null },
};

export default function ProcessingStatus({ status, error }: ProcessingStatusProps) {
  if (status === "idle") return null;

  const info = STATUS_MAP[status];

  return (
    <div className={`processing-status status-${status}`}>
      {info.icon}
      <span>{error || info.text}</span>
      {status === "processing" && (
        <div className="progress-bar">
          <div className="progress-fill" />
        </div>
      )}
    </div>
  );
}
