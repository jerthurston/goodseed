/**
 * NextAuth Events
 * 
 * Events được fired AFTER một action hoàn thành.
 * Khác với callbacks (chạy BEFORE), events không thể ngăn chặn action.
 * 
 * Use cases:
 * - Logging
 * - Analytics
 * - Cập nhật metadata
 * - Trigger side effects
 * 
 * ⚠️ LƯU Ý:
 * - Events KHÔNG nên throw errors (sẽ break auth flow)
 * - Events KHÔNG nên tạo records mà adapter đã tạo
 * - Events nên có try-catch để handle gracefully
 */

export { linkAccountEvent } from './linkAccount.event';

// Có thể thêm các events khác:
// export { signInEvent } from './signIn.event';
// export { signOutEvent } from './signOut.event';
// export { createUserEvent } from './createUser.event';
// export { updateUserEvent } from './updateUser.event';
