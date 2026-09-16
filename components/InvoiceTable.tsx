"use client";

import { useState } from "react";
import {
  FileText,
  Package,
  Plus,
  Trash2,
  Calculator,
  Eye,
  Edit3,
  Check,
} from "lucide-react";

export interface InvoiceItem {
  description?: string;
  unit?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  total?: number | string;
}

export interface InvoiceData {
  seller?: string;
  taxCode?: string;
  address?: string;
  invoiceNumber?: string;
  invoiceSerial?: string;
  invoiceDate?: string;
  totalBeforeVAT?: number | string;
  vatRate?: string;
  vatAmount?: number | string;
  totalPayment?: number | string;
  buyer?: string;
  buyerTaxCode?: string;
  paymentMethod?: string;
  items?: InvoiceItem[];
  [key: string]: unknown;
}

interface InvoiceTableProps {
  data: InvoiceData;
  fileUrl?: string;
  fileName?: string;
  onChange?: (updatedData: InvoiceData) => void;
}

const FIELD_LABELS: Record<string, string> = {
  seller: "Người bán",
  taxCode: "MST Người bán",
  address: "Địa chỉ",
  invoiceNumber: "Số hóa đơn",
  invoiceSerial: "Ký hiệu",
  invoiceDate: "Ngày hóa đơn",
  totalBeforeVAT: "Tiền trước thuế",
  vatRate: "Thuế suất (%)",
  vatAmount: "Tiền thuế GTGT",
  totalPayment: "Tổng thanh toán",
  buyer: "Người mua",
  buyerTaxCode: "MST Người mua",
  paymentMethod: "Hình thức thanh toán",
};

const NUMERIC_FIELDS = ["totalBeforeVAT", "vatAmount", "totalPayment"];

export default function InvoiceTable({
  data,
  fileUrl,
  fileName,
  onChange,
}: InvoiceTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InvoiceData>(data);
  const [showDocPreview, setShowDocPreview] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    let finalVal: string | number = value;
    if (NUMERIC_FIELDS.includes(key)) {
      const cleanNum = value.replace(/[^0-9.-]+/g, "");
      finalVal = cleanNum !== "" ? Number(cleanNum) : value;
    }
    const updated = { ...formData, [key]: finalVal };
    setFormData(updated);
    onChange?.(updated);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string
  ) => {
    const items = [...(formData.items || [])];
    const currentItem = { ...items[index] };

    if (field === "quantity" || field === "unitPrice") {
      const cleanNum = value.replace(/[^0-9.-]+/g, "");
      const numVal = cleanNum !== "" ? Number(cleanNum) : value;
      currentItem[field] = numVal;

      const qty = field === "quantity" ? Number(numVal) || 0 : Number(currentItem.quantity) || 0;
      const price = field === "unitPrice" ? Number(numVal) || 0 : Number(currentItem.unitPrice) || 0;
      if (qty > 0 && price > 0) {
        currentItem.total = qty * price;
      }
    } else if (field === "total") {
      const cleanNum = value.replace(/[^0-9.-]+/g, "");
      currentItem.total = cleanNum !== "" ? Number(cleanNum) : value;
    } else {
      currentItem[field] = value;
    }

    items[index] = currentItem;
    const updated = { ...formData, items };
    setFormData(updated);
    onChange?.(updated);
  };

  const handleAddItem = () => {
    const items = [...(formData.items || [])];
    items.push({
      description: "",
      unit: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    });
    const updated = { ...formData, items };
    setFormData(updated);
    onChange?.(updated);
  };

  const handleDeleteItem = (index: number) => {
    const items = (formData.items || []).filter((_, i) => i !== index);
    const updated = { ...formData, items };
    setFormData(updated);
    onChange?.(updated);
  };

  const handleRecalculateTotals = () => {
    const items = formData.items || [];
    const sumBeforeVAT = items.reduce((acc, it) => {
      const lineTotal = typeof it.total === "number" ? it.total : Number(it.total) || 0;
      return acc + lineTotal;
    }, 0);

    let vatRatePercent = 0;
    if (formData.vatRate) {
      const parsed = parseFloat(String(formData.vatRate).replace("%", ""));
      if (!isNaN(parsed)) vatRatePercent = parsed;
    }

    const calculatedVat = Math.round(sumBeforeVAT * (vatRatePercent / 100));
    const calculatedTotal = sumBeforeVAT + calculatedVat;

    const updated = {
      ...formData,
      totalBeforeVAT: sumBeforeVAT > 0 ? sumBeforeVAT : formData.totalBeforeVAT,
      vatAmount: calculatedVat > 0 ? calculatedVat : formData.vatAmount,
      totalPayment: calculatedTotal > 0 ? calculatedTotal : formData.totalPayment,
    };

    setFormData(updated);
    onChange?.(updated);
  };

  const formatDisplay = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === "N/A") return "N/A";
    if (NUMERIC_FIELDS.includes(key) && typeof value === "number") {
      return value.toLocaleString("vi-VN") + " ₫";
    }
    return String(value);
  };

  const items = formData.items || [];

  return (
    <div className="invoice-result-container">
      <div className="invoice-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className={`btn-mode ${isEditing ? "active-edit" : "active-view"}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <Check size={15} /> Xong chỉnh sửa
              </>
            ) : (
              <>
                <Edit3 size={15} /> Chỉnh sửa đối soát
              </>
            )}
          </button>

          {isEditing && items.length > 0 && (
            <button
              type="button"
              className="btn-action-tool"
              onClick={handleRecalculateTotals}
              title="Tự động cộng tiền hàng và tính thuế"
            >
              <Calculator size={15} /> Tính lại tổng tiền
            </button>
          )}
        </div>

        {fileUrl && (
          <button
            type="button"
            className="btn-preview-doc"
            onClick={() => setShowDocPreview(!showDocPreview)}
          >
            <Eye size={15} />
            {showDocPreview ? "Ẩn hóa đơn gốc" : "Xem hóa đơn gốc"}
          </button>
        )}
      </div>

      <div className={`invoice-layout-grid ${showDocPreview ? "has-preview" : ""}`}>
        {showDocPreview && fileUrl && (
          <div className="doc-preview-pane">
            <div className="doc-preview-header">
              <span>Hóa đơn gốc: {fileName}</span>
            </div>
            <div className="doc-preview-body">
              {fileName?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={fileUrl} className="pdf-frame" title="Xem PDF" />
              ) : (
                <img
                  src={fileUrl}
                  alt="Hóa đơn gốc"
                  className="img-preview-doc"
                />
              )}
            </div>
          </div>
        )}

        <div className="invoice-data-pane">
          <div className="result-section">
            <h3 className="section-heading">
              <FileText size={17} style={{ color: "var(--primary-600)", display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              Thông tin chung hóa đơn
            </h3>

            <div className="info-grid-responsive">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = formData[key];
                return (
                  <div key={key} className="info-field-box">
                    <label className="field-label">{label}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="field-input-edit"
                        value={val !== undefined && val !== null ? String(val) : ""}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder={`Nhập ${label.toLowerCase()}...`}
                      />
                    ) : (
                      <div className="field-value-display">
                        {formatDisplay(key, val)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="result-section" style={{ marginTop: "16px" }}>
            <div className="items-header-bar">
              <h3 className="section-heading">
                <Package size={17} style={{ color: "var(--primary-600)", display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                Chi tiết hàng hóa / dịch vụ ({items.length} mục)
              </h3>
              {isEditing && (
                <button
                  type="button"
                  className="btn-add-item"
                  onClick={handleAddItem}
                >
                  <Plus size={14} /> Thêm mặt hàng
                </button>
              )}
            </div>

            <div className="table-wrapper">
              <table className="items-table-modern">
                <thead>
                  <tr>
                    <th style={{ width: "45px" }}>#</th>
                    <th>Tên hàng hóa / Dịch vụ</th>
                    <th style={{ width: "90px" }}>ĐVT</th>
                    <th style={{ width: "90px" }}>SL</th>
                    <th style={{ width: "130px" }}>Đơn giá</th>
                    <th style={{ width: "140px" }}>Thành tiền</th>
                    {isEditing && <th style={{ width: "50px" }}>Xóa</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isEditing ? 7 : 6}
                        style={{ textAlign: "center", color: "#888", padding: "16px" }}
                      >
                        Không có chi tiết mặt hàng
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "center", fontWeight: 500 }}>{idx + 1}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input-cell"
                              value={item.description || ""}
                              onChange={(e) =>
                                handleItemChange(idx, "description", e.target.value)
                              }
                              placeholder="Mô tả sản phẩm..."
                            />
                          ) : (
                            <span>{String(item.description || "")}</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input-cell"
                              value={item.unit || ""}
                              onChange={(e) =>
                                handleItemChange(idx, "unit", e.target.value)
                              }
                              placeholder="ĐVT"
                            />
                          ) : (
                            <span>{String(item.unit || "")}</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input-cell num-input"
                              value={item.quantity !== undefined ? String(item.quantity) : ""}
                              onChange={(e) =>
                                handleItemChange(idx, "quantity", e.target.value)
                              }
                            />
                          ) : (
                            <span className="num">{String(item.quantity || "")}</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input-cell num-input"
                              value={item.unitPrice !== undefined ? String(item.unitPrice) : ""}
                              onChange={(e) =>
                                handleItemChange(idx, "unitPrice", e.target.value)
                              }
                            />
                          ) : (
                            <span className="num">
                              {typeof item.unitPrice === "number"
                                ? item.unitPrice.toLocaleString("vi-VN")
                                : String(item.unitPrice || "")}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="table-input-cell num-input"
                              style={{ fontWeight: 600 }}
                              value={item.total !== undefined ? String(item.total) : ""}
                              onChange={(e) =>
                                handleItemChange(idx, "total", e.target.value)
                              }
                            />
                          ) : (
                            <span className="num" style={{ fontWeight: 600 }}>
                              {typeof item.total === "number"
                                ? item.total.toLocaleString("vi-VN")
                                : String(item.total || "")}
                            </span>
                          )}
                        </td>
                        {isEditing && (
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-delete-row"
                              onClick={() => handleDeleteItem(idx)}
                              title="Xóa dòng này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
