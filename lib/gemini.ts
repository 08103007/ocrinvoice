const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";

interface GeminiPart {
  inlineData?: { mimeType: string; data: string };
  text?: string;
}

const ALL_FIELDS: Record<string, string> = {
  seller: "Tên người bán",
  taxCode: "Mã số thuế người bán",
  address: "Địa chỉ người bán",
  invoiceNumber: "Số hóa đơn",
  invoiceSerial: "Ký hiệu hóa đơn",
  invoiceDate: "DD/MM/YYYY",
  totalBeforeVAT: "Số tiền trước thuế",
  vatRate: "Thuế suất (%)",
  vatAmount: "Tiền thuế GTGT",
  totalPayment: "Tổng thanh toán",
  buyer: "Tên người mua",
  buyerTaxCode: "Mã số thuế người mua",
  paymentMethod: "Hình thức thanh toán",
};

function buildPrompt(selectedFields?: string[]): string {
  const fields = selectedFields || Object.keys(ALL_FIELDS);
  
  const fieldEntries: string[] = [];
  for (const key of fields) {
    if (key === "items") continue;
    if (ALL_FIELDS[key]) {
      fieldEntries.push(`  "${key}": "${ALL_FIELDS[key]}"`);
    }
  }

  const includeItems = !selectedFields || selectedFields.includes("items");
  const itemsBlock = includeItems
    ? `,\n  "items": [\n    {\n      "description": "Mô tả hàng hóa/dịch vụ",\n      "unit": "Đơn vị tính",\n      "quantity": "Số lượng",\n      "unitPrice": "Đơn giá",\n      "total": "Thành tiền"\n    }\n  ]`
    : "";

  return `You are a smart accountant assistant.
From the provided Vietnamese invoice (hóa đơn), extract the following fields and return ONLY a valid JSON object with exactly these fields:

{
${fieldEntries.join(",\n")}${itemsBlock}
}

Rules:
- All amounts should be numbers (no dots as thousand separators). Example: 1500000 not 1.500.000
- If any field is missing, use "N/A"
- Return ONLY the JSON object, no markdown, no explanation
- invoiceDate must be DD/MM/YYYY format${includeItems ? "\n- items is an array, include ALL line items from the invoice" : ""}`;
}

export async function extractInvoiceData(
  fileBase64: string,
  mimeType: string,
  selectedFields?: string[]
): Promise<Record<string, unknown>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const parts: GeminiPart[] = [
    { inlineData: { mimeType, data: fileBase64 } },
    { text: buildPrompt(selectedFields) },
  ];

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return parseGeminiResponse(content);
}

function parseGeminiResponse(content: string): Record<string, unknown> {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${cleaned.substring(0, 200)}`);
  }
}
