# OCR Invoice App

Ứng dụng web trích xuất thông tin hóa đơn tự động bằng AI — Powered by **Gemini 2.5 Flash**.

## Tính năng

- **Upload nhiều file** — Hỗ trợ PDF, PNG, JPG, WebP. Upload 1 hoặc nhiều file cùng lúc (tối đa 20)
- **Upload folder** — Chọn cả folder chứa hóa đơn, tự scan file hợp lệ
- **Chọn trường trích xuất** — Checkbox chọn trường cần extract + 4 presets (Tất cả, Kế toán, Mua hàng, Thuế)
- **Kết quả chi tiết** — Bảng thông tin hóa đơn + chi tiết hàng hóa/dịch vụ, collapsible cards cho batch
- **Export Excel** — Download file `.xlsx` (single hoặc batch), bao gồm Summary sheet + Items sheets
- **Copy JSON** — Copy dữ liệu raw về clipboard
- **Đăng nhập bảo mật** — ID/password đơn giản

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS (Teal/Emerald palette) |
| Auth | NextAuth.js (Credentials) |
| AI Engine | Gemini 2.5 Flash |
| Excel | ExcelJS |
| Icons | Lucide React |

## Setup

```bash
# Clone
git clone https://github.com/Ronalle6215/ocr-invoice-app.git
cd ocr-invoice-app

# Install
npm install

# Environment variables
cp .env.local.example .env.local
# Edit .env.local — add your GEMINI_API_KEY

# Run
npm run dev
```

### Environment Variables (`.env.local`)

```env
GEMINI_API_KEY=your_key_from_makersuite
AUTH_USER=admin
AUTH_PASSWORD=invoice2026
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

## Hướng dẫn sử dụng

### 1. Đăng nhập
- Mở app → nhập username/password → Đăng nhập

### 2. Chọn trường trích xuất (tùy chọn)
- Click **"Trường trích xuất"** để mở panel
- Chọn preset hoặc tick từng trường cần lấy
- Presets: **Tất cả** (14 trường), **Kế toán** (13), **Mua hàng** (5), **Thuế** (10)

### 3. Upload hóa đơn
- **Files mode**: Kéo thả hoặc click chọn 1-20 files
- **Folder mode**: Click "Folder" toggle → chọn folder chứa hóa đơn
- Hỗ trợ: PDF, PNG, JPG, WebP — tối đa 10MB/file

### 4. Xem kết quả
- Mỗi hóa đơn hiển thị trong 1 card có thể mở/đóng
- Xem thông tin + chi tiết hàng hóa

### 5. Export
- **Tải Excel**: Download file `.xlsx` (batch: 1 file gồm Summary + Items per invoice)
- **Copy JSON**: Copy dữ liệu thô

## Deploy lên Vercel

1. Push code lên GitHub
2. Vào [vercel.com](https://vercel.com) → Import repo
3. Thêm Environment Variables (4 biến từ `.env.local`)
4. Deploy → Share URL cho nhân viên

## Project Structure

```
├── app/
│   ├── api/auth/       # NextAuth API
│   ├── api/ocr/        # OCR endpoint (Gemini AI)
│   ├── api/export/     # Excel export
│   ├── dashboard/      # Main app page
│   ├── login/          # Login page
│   └── globals.css     # All styles
├── components/
│   ├── FileUploader    # Multi-file + folder upload
│   ├── FieldSelector   # Field checkbox + presets
│   ├── InvoiceTable    # Results display
│   ├── ExportButtons   # Excel + JSON export
│   └── ProcessingStatus # Loading + skeleton
├── lib/gemini.ts       # Gemini API wrapper
└── middleware.ts       # Auth protection
```
