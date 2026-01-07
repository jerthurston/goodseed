/**
 * Làm mới access token sử dụng refresh token
 * @param refreshToken Refresh token hiện tại
 * @returns Đối tượng chứa access token mới và thông tin liên quan
 */

//Định nghĩa interface cho response khi refresh token
interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  try {
    // Thay đổi URL và tham số dựa vào provider bạn đang sử dụng
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID || "",
        client_secret: process.env.AUTH_GOOGLE_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(refreshedTokens.error_description || "Failed to refresh token");
    }

    return {
      access_token: refreshedTokens.access_token,
      refresh_token: refreshedTokens.refresh_token ?? refreshToken, // Nếu không có refresh token mới thì giữ cái cũ
      expires_in: refreshedTokens.expires_in,
    };
  } catch (error) {
    console.error("Lỗi khi refresh token:", error);
    throw error;
  }
}