import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface InvoiceItem {
  description?: string;
  unit?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  total?: string | number;
}

export async function POST(request: Request) {
  try {
    const { data, fileName } = await request.json();

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "OCR Invoice App";
    workbook.created = new Date();

    // Sheet 1: Invoice Info
    const infoSheet = workbook.addWorksheet("Invoice Info");
    infoSheet.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Value", key: "value", width: 50 },
    ];

    const fieldLabels: Record<string, string> = {
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

    for (const [key, label] of Object.entries(fieldLabels)) {
      if (data[key] !== undefined) {
        infoSheet.addRow({ field: label, value: String(data[key]) });
      }
    }

    // Style header row
    const infoHeaderRow = infoSheet.getRow(1);
    infoHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    infoHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" },
    };

    // Sheet 2: Items
    const items: InvoiceItem[] = data.items || [];
    if (items.length > 0) {
      const itemsSheet = workbook.addWorksheet("Items");
      itemsSheet.columns = [
        { header: "#", key: "index", width: 5 },
        { header: "Mô tả", key: "description", width: 45 },
        { header: "ĐVT", key: "unit", width: 10 },
        { header: "Số lượng", key: "quantity", width: 12 },
        { header: "Đơn giá", key: "unitPrice", width: 18 },
        { header: "Thành tiền", key: "total", width: 18 },
      ];

      items.forEach((item, idx) => {
        itemsSheet.addRow({
          index: idx + 1,
          description: item.description || "",
          unit: item.unit || "",
          quantity: item.quantity || "",
          unitPrice: item.unitPrice || "",
          total: item.total || "",
        });
      });

      // Style header
      const itemsHeaderRow = itemsSheet.getRow(1);
      itemsHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      itemsHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D9488" },
      };

      // Format number columns
      ["quantity", "unitPrice", "total"].forEach((col) => {
        const column = itemsSheet.getColumn(col);
        column.numFmt = "#,##0";
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const outputName = fileName
      ? fileName.replace(/\.[^.]+$/, "") + "_OCR.xlsx"
      : "invoice_ocr.xlsx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Excel export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
