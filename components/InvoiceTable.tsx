"use client";

import { FileText, Package } from "lucide-react";

interface InvoiceData {
  [key: string]: unknown;
  items?: Array<Record<string, unknown>>;
}

interface InvoiceTableProps {
  data: InvoiceData;
}

const FIELD_LABELS: Record<string, string> = {
  seller: "Người bán",
  taxCode: "MST Người bán",
  address: "Địa chỉ",
  invoiceNumber: "Số hóa đơn",
  invoiceSerial: "Ký hiệu",
  invoiceDate: "Ngày hóa đơn",
  totalBeforeVAT: "Tiền trước thuế",
  vatRate: "Thuế suất",
  vatAmount: "Tiền thuế GTGT",
  totalPayment: "Tổng thanh toán",
  buyer: "Người mua",
  buyerTaxCode: "MST Người mua",
  paymentMethod: "Hình thức thanh toán",
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "N/A") return "N/A";
  const numKeys = ["totalBeforeVAT", "vatAmount", "totalPayment"];
  if (numKeys.includes(key) && typeof value === "number") {
    return value.toLocaleString("vi-VN") + " ₫";
  }
  return String(value);
}

export default function InvoiceTable({ data }: InvoiceTableProps) {
  const infoFields = Object.entries(FIELD_LABELS).filter(
    ([key]) => data[key] !== undefined
  );

  const items = (data.items || []) as Array<Record<string, unknown>>;

  return (
    <div className="invoice-result">
      <div className="result-section">
        <h3>
          <FileText size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
          Thông tin hóa đơn
        </h3>
        <div className="info-grid">
          {infoFields.map(([key, label]) => (
            <div key={key} className="info-row">
              <span className="info-label">{label}</span>
              <span className="info-value">{formatValue(key, data[key])}</span>
            </div>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="result-section">
          <h3>
            <Package size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Chi tiết hàng hóa / dịch vụ
          </h3>
          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mô tả</th>
                  <th>ĐVT</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{String(item.description || "")}</td>
                    <td>{String(item.unit || "")}</td>
                    <td className="num">{String(item.quantity || "")}</td>
                    <td className="num">
                      {typeof item.unitPrice === "number"
                        ? item.unitPrice.toLocaleString("vi-VN")
                        : String(item.unitPrice || "")}
                    </td>
                    <td className="num">
                      {typeof item.total === "number"
                        ? item.total.toLocaleString("vi-VN")
                        : String(item.total || "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
