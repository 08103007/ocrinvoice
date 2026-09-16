import { NextResponse } from "next/server";
import { extractInvoiceData } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fieldsParam = formData.get("fields") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported: PDF, PNG, JPG, WebP` },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const selectedFields = fieldsParam ? fieldsParam.split(",") : undefined;
    const apiKeyParam = (formData.get("apiKey") as string | null) || undefined;
    const result = await extractInvoiceData(base64, file.type, selectedFields, apiKeyParam);

    return NextResponse.json({
      success: true,
      data: result,
      fileName: file.name,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("OCR API Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
