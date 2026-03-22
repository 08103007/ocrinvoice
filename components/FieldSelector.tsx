"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

export const ALL_FIELDS = [
  { key: "seller", label: "Người bán" },
  { key: "taxCode", label: "MST Người bán" },
  { key: "address", label: "Địa chỉ" },
  { key: "invoiceNumber", label: "Số hóa đơn" },
  { key: "invoiceSerial", label: "Ký hiệu" },
  { key: "invoiceDate", label: "Ngày hóa đơn" },
  { key: "totalBeforeVAT", label: "Tiền trước thuế" },
  { key: "vatRate", label: "Thuế suất" },
  { key: "vatAmount", label: "Tiền thuế GTGT" },
  { key: "totalPayment", label: "Tổng thanh toán" },
  { key: "buyer", label: "Người mua" },
  { key: "buyerTaxCode", label: "MST Người mua" },
  { key: "paymentMethod", label: "Hình thức TT" },
  { key: "items", label: "Chi tiết hàng hóa" },
] as const;

const PRESETS: Record<string, string[]> = {
  "Tất cả": ALL_FIELDS.map((f) => f.key),
  "Kế toán": [
    "seller", "taxCode", "invoiceNumber", "invoiceSerial", "invoiceDate",
    "totalBeforeVAT", "vatRate", "vatAmount", "totalPayment", "buyer",
    "buyerTaxCode", "paymentMethod", "items",
  ],
  "Mua hàng": [
    "seller", "invoiceNumber", "invoiceDate", "totalPayment", "items",
  ],
  "Thuế": [
    "seller", "taxCode", "invoiceNumber", "invoiceSerial", "invoiceDate",
    "totalBeforeVAT", "vatRate", "vatAmount", "totalPayment", "buyerTaxCode",
  ],
};

interface FieldSelectorProps {
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export default function FieldSelector({ selectedFields, onFieldsChange }: FieldSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  const activePreset = Object.entries(PRESETS).find(
    ([, fields]) =>
      fields.length === selectedFields.length &&
      fields.every((f) => selectedFields.includes(f))
  )?.[0];

  const toggleField = (key: string) => {
    if (selectedFields.includes(key)) {
      onFieldsChange(selectedFields.filter((f) => f !== key));
    } else {
      onFieldsChange([...selectedFields, key]);
    }
  };

  return (
    <div className="field-selector">
      <div className="field-selector-header">
        <button
          className="toggle-btn active"
          onClick={() => setExpanded(!expanded)}
          style={{ background: "transparent", boxShadow: "none" }}
          aria-label="Toggle field selection"
        >
          <Settings size={16} />
          <span>Trường trích xuất {!expanded ? `(${selectedFields.length})` : ""}</span>
        </button>
        {expanded && (
          <div className="preset-buttons">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                className={`btn-preset ${activePreset === name ? "active" : ""}`}
                onClick={() => onFieldsChange([...PRESETS[name]])}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      {expanded && (
        <div className="field-grid">
          {ALL_FIELDS.map(({ key, label }) => (
            <label key={key} className="field-checkbox">
              <input
                type="checkbox"
                checked={selectedFields.includes(key)}
                onChange={() => toggleField(key)}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
