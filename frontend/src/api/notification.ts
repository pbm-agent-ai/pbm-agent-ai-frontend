import { createApiClient } from './clients/apiClientFactory';

const notificationApiClient = createApiClient({
  baseURL: import.meta.env.VITE_NOTIFICATION_API_BASE_URL ?? '',
});

export interface NotificationPreference {
  email: string | null;
  emailEnabled: boolean;
  telegramChatId: string | null;
  telegramLinked: boolean;
  telegramEnabled: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface NotificationPreferenceRequest {
  email: string | null;
  emailEnabled: boolean;
  telegramEnabled: boolean;
}

export async function fetchNotificationPreference(): Promise<NotificationPreference> {
  const { data } = await notificationApiClient.get<ApiResponse<NotificationPreference>>(
    '/api/notifications/preferences',
  );
  return data.data;
}

export async function updateNotificationPreference(
  request: NotificationPreferenceRequest,
): Promise<NotificationPreference> {
  const { data } = await notificationApiClient.post<ApiResponse<NotificationPreference>>(
    '/api/notifications/preferences',
    request,
  );
  return data.data;
}

export async function linkTelegramByChatId(chatId: string): Promise<NotificationPreference> {
  const { data } = await notificationApiClient.post<ApiResponse<NotificationPreference>>(
    '/api/notifications/preferences/telegram',
    { chatId },
  );
  return data.data;
}

export async function unlinkTelegram(): Promise<void> {
  await notificationApiClient.delete('/api/notifications/preferences/telegram');
}

export async function sendTestTelegram(): Promise<void> {
  await notificationApiClient.post('/api/notifications/preferences/telegram/test');
}

export async function sendTestEmail(email: string): Promise<void> {
  await notificationApiClient.post('/api/notifications/preferences/email/test', { email });
}
