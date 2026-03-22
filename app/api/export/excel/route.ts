import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface InvoiceItem {
  description?: string;
  unit?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  total?: string | number;
}

interface InvoiceResult {
  data: Record<string, unknown>;
  fileName: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support both single invoice and batch
    const invoices: InvoiceResult[] = body.invoices || [
      { data: body.data, fileName: body.fileName },
    ];

    if (!invoices.length || !invoices[0].data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "OCR Invoice App";
    workbook.created = new Date();

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

    const tealColor = "FF0D9488";
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: tealColor } },
    };

    if (invoices.length === 1) {
      // Single invoice: same layout as before
      const data = invoices[0].data;

      const infoSheet = workbook.addWorksheet("Invoice Info");
      infoSheet.columns = [
        { header: "Field", key: "field", width: 25 },
        { header: "Value", key: "value", width: 50 },
      ];

      for (const [key, label] of Object.entries(fieldLabels)) {
        if (data[key] !== undefined) {
          infoSheet.addRow({ field: label, value: String(data[key]) });
        }
      }

      Object.assign(infoSheet.getRow(1), headerStyle);
      infoSheet.getRow(1).font = headerStyle.font!;
      infoSheet.getRow(1).fill = headerStyle.fill as ExcelJS.Fill;

      const items: InvoiceItem[] = (data.items as InvoiceItem[]) || [];
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

        itemsSheet.getRow(1).font = headerStyle.font!;
        itemsSheet.getRow(1).fill = headerStyle.fill as ExcelJS.Fill;
        ["quantity", "unitPrice", "total"].forEach((col) => {
          itemsSheet.getColumn(col).numFmt = "#,##0";
        });
      }
    } else {
      // BATCH: All invoices in one summary sheet
      const fieldKeys = Object.keys(fieldLabels);
      const summarySheet = workbook.addWorksheet("Summary");

      const columns: Partial<ExcelJS.Column>[] = [
        { header: "#", key: "index", width: 5 },
        { header: "File", key: "fileName", width: 30 },
        ...fieldKeys.map((key) => ({
          header: fieldLabels[key],
          key,
          width: key === "seller" || key === "address" ? 35 : 20,
        })),
      ];
      summarySheet.columns = columns;

      invoices.forEach((inv, idx) => {
        const row: Record<string, unknown> = {
          index: idx + 1,
          fileName: inv.fileName,
        };
        for (const key of fieldKeys) {
          row[key] = inv.data[key] !== undefined ? String(inv.data[key]) : "";
        }
        summarySheet.addRow(row);
      });

      summarySheet.getRow(1).font = headerStyle.font!;
      summarySheet.getRow(1).fill = headerStyle.fill as ExcelJS.Fill;

      // Number formatting for amount columns
      ["totalBeforeVAT", "vatAmount", "totalPayment"].forEach((col) => {
        const column = summarySheet.getColumn(col);
        if (column) column.numFmt = "#,##0";
      });

      // Items detail sheets per invoice
      invoices.forEach((inv, idx) => {
        const items: InvoiceItem[] = (inv.data.items as InvoiceItem[]) || [];
        if (items.length > 0) {
          const sheetName = `Items_${idx + 1}`;
          const itemsSheet = workbook.addWorksheet(sheetName);
          itemsSheet.columns = [
            { header: "#", key: "index", width: 5 },
            { header: "Mô tả", key: "description", width: 45 },
            { header: "ĐVT", key: "unit", width: 10 },
            { header: "Số lượng", key: "quantity", width: 12 },
            { header: "Đơn giá", key: "unitPrice", width: 18 },
            { header: "Thành tiền", key: "total", width: 18 },
          ];

          items.forEach((item, i) => {
            itemsSheet.addRow({
              index: i + 1,
              description: item.description || "",
              unit: item.unit || "",
              quantity: item.quantity || "",
              unitPrice: item.unitPrice || "",
              total: item.total || "",
            });
          });

          itemsSheet.getRow(1).font = headerStyle.font!;
          itemsSheet.getRow(1).fill = headerStyle.fill as ExcelJS.Fill;
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const baseName =
      invoices.length === 1
        ? (invoices[0].fileName || "invoice").replace(/\.[^.]+$/, "")
        : `batch_${invoices.length}_invoices`;
    const outputName = `${baseName}_OCR.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Excel export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
