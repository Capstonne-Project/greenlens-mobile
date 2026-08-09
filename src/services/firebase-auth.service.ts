/**
 * Đổi Google OAuth id_token → Firebase ID token.
 *
 * BE verify bằng Firebase Admin SDK (`FirebaseAuth.VerifyIdTokenAsync`), nên token Google thô
 * KHÔNG dùng trực tiếp được — phải qua Firebase Identity Toolkit `signInWithIdp` để lấy
 * `idToken` do Firebase phát hành.
 *
 * Dùng REST API thay vì Firebase SDK để chạy được cả trên Expo Go (không cần native module).
 */

const IDENTITY_TOOLKIT_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp';

interface SignInWithIdpResponse {
  idToken?: string;
  error?: { message?: string };
}

/**
 * @param googleIdToken `id_token` nhận từ Google OAuth
 * @param apiKey Firebase Web API key (Project settings → General → Web API Key)
 * @returns Firebase ID token để gửi lên `POST /auth/google-login`
 */
export async function exchangeGoogleTokenForFirebaseIdToken(
  googleIdToken: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${IDENTITY_TOOLKIT_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${googleIdToken}&providerId=google.com`,
      // Bắt buộc theo spec signInWithIdp, không dùng để redirect thật.
      requestUri: 'http://localhost',
      returnSecureToken: true,
      returnIdpCredential: true,
    }),
  });

  const body = (await response.json()) as SignInWithIdpResponse;

  if (!response.ok || !body.idToken) {
    // Message của Google có thể lộ chi tiết cấu hình — chỉ log khi dev.
    if (__DEV__) {
      console.log('[FIREBASE_IDP] exchange failed', response.status, body.error?.message);
    }
    throw new Error('FIREBASE_TOKEN_EXCHANGE_FAILED');
  }

  return body.idToken;
}
