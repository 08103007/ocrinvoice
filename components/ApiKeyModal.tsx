"use client";

import { useState, useEffect } from "react";
import { Key, Save, X, Eye, EyeOff, CheckCircle } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  onKeySaved,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("GEMINI_API_KEY") || "";
      setApiKey(stored);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (typeof window !== "undefined") {
      if (trimmed) {
        localStorage.setItem("GEMINI_API_KEY", trimmed);
      } else {
        localStorage.removeItem("GEMINI_API_KEY");
      }
    }
    onKeySaved(trimmed);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={20} style={{ color: "var(--primary-600)" }} />
            <h3>Cài đặt Gemini API Key</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Nhập Gemini API Key từ tài khoản Google của bạn để sử dụng tính năng đọc hóa đơn bằng AI.
            (API Key được lưu an toàn trực tiếp trên trình duyệt của bạn).
          </p>

          <div className="api-key-input-wrapper">
            <input
              type={showKey ? "text" : "password"}
              className="api-key-input"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="btn-toggle-eye"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Ẩn key" : "Hiện key"}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="api-key-help">
            <span>Chưa có API Key?</span>{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--primary-600)", textDecoration: "underline", fontWeight: 500 }}
            >
              Lấy API Key miễn phí tại Google AI Studio
            </a>
          </div>

          {savedSuccess && (
            <div className="save-alert-success">
              <CheckCircle size={16} />
              <span>Đã lưu API Key thành công!</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary-modal" onClick={handleSave}>
            <Save size={16} />
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
