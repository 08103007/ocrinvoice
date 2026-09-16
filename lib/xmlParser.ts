import { XMLParser } from "fast-xml-parser";
import { InvoiceData, InvoiceItem } from "@/components/InvoiceTable";

function findDeepKey(obj: unknown, targetKeys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  const targetLower = targetKeys.map((k) => k.toLowerCase());

  // Check current level
  for (const [key, val] of Object.entries(obj)) {
    if (targetLower.includes(key.toLowerCase()) && val !== undefined && val !== null && val !== "") {
      return val;
    }
  }

  // Recurse into children
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const res = findDeepKey(val, targetKeys);
      if (res !== undefined) return res;
    }
  }

  return undefined;
}

function parseNumber(val: unknown): number | undefined {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

function formatDate(val: unknown): string | undefined {
  if (!val || typeof val !== "string") return undefined;
  const str = val.trim();
  // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    return str;
  }
  return str;
}

export function parseXmlInvoice(xmlContent: string): InvoiceData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });

  const parsed = parser.parse(xmlContent);

  // 1. Seller Information (NBan / Seller / DonViBan)
  const nbanObj = findDeepKey(parsed, ["NBan", "Seller", "DonViBan", "Supplier"]) || parsed;
  const seller = String(findDeepKey(nbanObj, ["Ten", "TenDonVi", "SellerName", "TNNBan"]) || findDeepKey(parsed, ["TenNBan", "SellerName"]) || "");
  const taxCode = String(findDeepKey(nbanObj, ["MST", "MaSoThue", "SellerTaxCode", "MSTNBan"]) || findDeepKey(parsed, ["MSTNBan"]) || "");
  const address = String(findDeepKey(nbanObj, ["DChi", "DiaChi", "SellerAddress", "DCNBan"]) || findDeepKey(parsed, ["DCNBan"]) || "");

  // 2. Buyer Information (NMua / Buyer / DonViMua)
  const nmuaObj = findDeepKey(parsed, ["NMua", "Buyer", "DonViMua", "Customer"]) || parsed;
  const buyer = String(findDeepKey(nmuaObj, ["Ten", "TenDonVi", "BuyerName", "TNNMua"]) || findDeepKey(parsed, ["TenNMua", "BuyerName"]) || "");
  const buyerTaxCode = String(findDeepKey(nmuaObj, ["MST", "MaSoThue", "BuyerTaxCode", "MSTNMua"]) || findDeepKey(parsed, ["MSTNMua"]) || "");

  // 3. General Invoice Info (TTChung / InvoiceInfo)
  const ttChung = findDeepKey(parsed, ["TTChung", "GeneralInvoiceInfo", "InvoiceInfo"]) || parsed;
  const invoiceNumber = String(findDeepKey(ttChung, ["SHDon", "SoHoaDon", "InvoiceNumber", "SHD"]) || findDeepKey(parsed, ["SHDon", "SoHoaDon"]) || "");
  const invoiceSerial = String(findDeepKey(ttChung, ["KHHDon", "KyHieu", "InvoiceSeries", "KHMSHDon", "Serial"]) || findDeepKey(parsed, ["KHHDon", "KyHieu"]) || "");
  const rawDate = findDeepKey(ttChung, ["NLap", "NgayLap", "InvoiceDate", "NgayHoaDon"]) || findDeepKey(parsed, ["NLap", "NgayLap", "InvoiceDate"]);
  const invoiceDate = formatDate(rawDate) || "";
  const paymentMethod = String(findDeepKey(ttChung, ["HTTToan", "HTTT", "PaymentMethod", "HinhThucTT"]) || findDeepKey(parsed, ["HTTToan", "HTTT"]) || "TM/CK");

  // 4. Totals (TToan / Payment / Summary)
  const ttoanObj = findDeepKey(parsed, ["TToan", "Payment", "Summary", "TongTien"]) || parsed;
  const totalBeforeVAT = parseNumber(findDeepKey(ttoanObj, ["TgTCThue", "TongTienChuaThue", "TotalBeforeTax", "TongTienHang", "TotalAmountWithoutVAT"]) || findDeepKey(parsed, ["TgTCThue", "TongTienChuaThue"]));
  const vatRate = String(findDeepKey(ttoanObj, ["TSuat", "ThuếSuất", "VATRate", "ThueSuat"]) || findDeepKey(parsed, ["TSuat", "VATRate"]) || "10%");
  const vatAmount = parseNumber(findDeepKey(ttoanObj, ["TgTThue", "TongTienThue", "VATAmount", "TienThueGTGT", "TotalVATAmount"]) || findDeepKey(parsed, ["TgTThue", "TongTienThue"]));
  const totalPayment = parseNumber(findDeepKey(ttoanObj, ["TgTTTBSo", "TongTienThanhToan", "TotalPayment", "TotalAmountWithVAT", "TongCong"]) || findDeepKey(parsed, ["TgTTTBSo", "TongTienThanhToan"]));

  // 5. Line Items (DSHHDVu / HHDVu / ProductList / Items)
  const itemsContainer = findDeepKey(parsed, ["DSHHDVu", "HHDVu", "ProductList", "Items", "InvoiceDetails", "ChiTietHangHoa"]);
  let rawItemsList: unknown[] = [];

  if (Array.isArray(itemsContainer)) {
    rawItemsList = itemsContainer;
  } else if (itemsContainer && typeof itemsContainer === "object") {
    const innerList = findDeepKey(itemsContainer, ["HHDVu", "Item", "ChiTiet", "Product"]);
    if (Array.isArray(innerList)) {
      rawItemsList = innerList;
    } else if (innerList && typeof innerList === "object") {
      rawItemsList = [innerList];
    } else {
      rawItemsList = [itemsContainer];
    }
  }

  const items: InvoiceItem[] = rawItemsList.map((it) => {
    const description = String(findDeepKey(it, ["THHDVu", "TenHang", "ProductName", "Description", "Ten"]) || "");
    const unit = String(findDeepKey(it, ["DVTinh", "DVT", "Unit", "DonViTinh"]) || "");
    const quantity = parseNumber(findDeepKey(it, ["SLuong", "SoLuong", "Quantity", "SL"])) || 1;
    const unitPrice = parseNumber(findDeepKey(it, ["DGia", "DonGia", "UnitPrice", "Gia"])) || 0;
    const total = parseNumber(findDeepKey(it, ["ThTien", "ThanhTien", "Amount", "Total", "ThTienChuaThue"])) || (quantity * unitPrice);

    return {
      description,
      unit,
      quantity,
      unitPrice,
      total,
    };
  }).filter((it) => it.description);

  return {
    seller: seller || "N/A",
    taxCode: taxCode || "N/A",
    address: address || "N/A",
    invoiceNumber: invoiceNumber || "N/A",
    invoiceSerial: invoiceSerial || "N/A",
    invoiceDate: invoiceDate || "N/A",
    totalBeforeVAT: totalBeforeVAT !== undefined ? totalBeforeVAT : "N/A",
    vatRate: vatRate || "N/A",
    vatAmount: vatAmount !== undefined ? vatAmount : "N/A",
    totalPayment: totalPayment !== undefined ? totalPayment : "N/A",
    buyer: buyer || "N/A",
    buyerTaxCode: buyerTaxCode || "N/A",
    paymentMethod: paymentMethod || "TM/CK",
    items,
  };
}
