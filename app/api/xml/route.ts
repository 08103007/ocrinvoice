import { NextResponse } from "next/server";
import { parseXmlInvoice } from "@/lib/xmlParser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xml") && file.type !== "text/xml" && file.type !== "application/xml") {
      return NextResponse.json(
        { error: "Định dạng file không hợp lệ. Vui lòng chọn file .xml" },
        { status: 400 }
      );
    }

    const xmlText = await file.text();
    const data = parseXmlInvoice(xmlText);

    return NextResponse.json({
      success: true,
      data,
      fileName: file.name,
      processedAt: new Date().toISOString(),
      isXml: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi khi đọc file XML";
    console.error("XML Parse Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
