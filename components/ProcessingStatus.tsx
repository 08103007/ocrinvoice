"use client";

import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

interface ProcessingStatusProps {
  status: Status;
  error: string;
  current?: number;
  total?: number;
}

function SkeletonLoading() {
  return (
    <div className="skeleton-container">
      <div className="skeleton-card">
        <div className="skeleton-line header" />
        <div className="skeleton-line" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="skeleton-line medium" />
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line header" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
      </div>
    </div>
  );
}

export default function ProcessingStatus({
  status,
  error,
  current,
  total,
}: ProcessingStatusProps) {
  if (status === "idle") return null;

  if (status === "processing" || status === "uploading") {
    const progressText =
      total && total > 1
        ? `Đang xử lý hóa đơn ${current || 1}/${total}...`
        : "Đang phân tích hóa đơn bằng AI...";

    return (
      <>
        <div className="processing-status status-processing">
          <Loader2 size={18} className="spin" />
          <span>{progressText}</span>
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
        <SkeletonLoading />
      </>
    );
  }

  if (status === "done") {
    return (
      <div className="processing-status status-done">
        <CheckCircle size={18} />
        <span>
          {total && total > 1
            ? `Hoàn thành trích xuất ${total} hóa đơn`
            : "Trích xuất hoàn tất"}
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="processing-status status-error">
        <AlertCircle size={18} />
        <span>{error || "Đã xảy ra lỗi"}</span>
      </div>
    );
  }

  return null;
}
