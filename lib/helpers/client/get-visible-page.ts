 export const getVisiblePages = (
    currentPage: number,
    totalPages: number,
    maxVisiblePages: number
 ): number[] => {
        const pages: number[] = [];
        // Tính toán số trang hiển thị, bao gồm cả trang hiện tại
        const halfVisible = Math.floor(maxVisiblePages / 2);
        // Nếu trang hiện tại nằm ở nửa đầu, bắt đầu từ trang 1
        let startPage = Math.max(1, currentPage - halfVisible);
        // Nếu trang hiện tại nằm ở nửa sau, bắt đầu từ trang cuối
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 3);

        // Adjust start if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        // Tạo mảng các trang hiển thị
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        // Trả về mảng các trang hiển thị
        return pages;
    };
    // Giải thích getVisiblePages:
    // Hàm này trả về một mảng các số trang mà người dùng có thể thấy trong phân trang.
    // Nó tính toán các trang bắt đầu và kết thúc dựa trên trang hiện tại, tổng số trang và số trang tối đa có thể hiển thị.