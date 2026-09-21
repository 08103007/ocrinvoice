const getGeminiApiKey = () => process.env.GEMINI_API_KEY || "";

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

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-pro",
];

export async function extractInvoiceData(
  fileBase64: string,
  mimeType: string,
  selectedFields?: string[],
  customApiKey?: string
): Promise<Record<string, unknown>> {
  const apiKey = customApiKey || getGeminiApiKey();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm GEMINI_API_KEY vào biến môi trường hoặc nhập API Key trên giao diện."
    );
  }

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

  // Filter unique valid model names
  const models = Array.from(new Set(CANDIDATE_MODELS.filter(Boolean))) as string[];
  let lastError = "";

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Gemini API (${model}) error ${response.status}: ${errorText}`;
        console.warn(`Model ${model} returned HTTP ${response.status}. Automatically falling back to next model...`);
        // If 503 (Overloaded), 429 (Rate Limit), 404 (Not Found), 500 -> Continue to next fallback model
        continue;
      }

      const result = await response.json();
      const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        lastError = `Model ${model} returned empty response`;
        console.warn(`${lastError}, trying fallback model...`);
        continue;
      }

      return parseGeminiResponse(content);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      lastError = `Error with model ${model}: ${errMsg}`;
      console.warn(`${lastError}. Trying next fallback model...`);
      continue;
    }
  }

  throw new Error(lastError || "Tất cả các mô hình Gemini đều đang bận hoặc quá tải. Vui lòng thử lại sau ít phút.");
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
