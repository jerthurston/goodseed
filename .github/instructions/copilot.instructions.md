---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

- Luôn sử dụng apiLogger cho việc logs lỗi trong ứng dụng. Không sử dụng console.log trừ khi được yêu cầu
- Khi viết hook luôn dùng với tanstack query.
- Việc cache dữ liệu cũng xử lý ở hook với tanstack query. Cần lưu ý không cache của các pages dashboard/admin.
- Tạo tài liệu ở production bằng tiếng anh. Không dùng tiếng việt.