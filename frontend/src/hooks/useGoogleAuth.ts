import { useEffect, useRef, useState } from 'react';

interface UseGoogleAuthProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  buttonElementId: string;
}

type GoogleCredentialResponse = {
  credential?: string;
};

let gsiScriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let credentialHandler: ((response: GoogleCredentialResponse) => void) | null = null;

const loadGoogleScript = () => {
  if ((window as any).google?.accounts?.id) {
    return Promise.resolve();
  }

  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    ) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');

    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được Google Identity script.'));

    if (!existing) {
      document.head.appendChild(script);
    }
  });

  return gsiScriptPromise;
};

export const useGoogleAuth = ({ onSuccess, onError, buttonElementId }: UseGoogleAuthProps) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let mounted = true;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      onErrorRef.current('Google Client ID chưa được cấu hình trong frontend/.env.');
      return;
    }

    const initAndRender = async () => {
      try {
        await loadGoogleScript();
        if (!mounted) return;

        const googleId = (window as any).google?.accounts?.id;
        if (!googleId) {
          throw new Error('Google Identity Services chưa sẵn sàng.');
        }

        credentialHandler = (response: GoogleCredentialResponse) => {
          if (response.credential) {
            onSuccessRef.current(response.credential);
            return;
          }
          onErrorRef.current('Đăng nhập Google thất bại: không nhận được credential.');
        };

        if (initializedClientId !== clientId) {
          googleId.initialize({
            client_id: clientId,
            callback: (response: GoogleCredentialResponse) => credentialHandler?.(response),
          });
          initializedClientId = clientId;
        }

        const btnElement = document.getElementById(buttonElementId);
        if (btnElement) {
          btnElement.innerHTML = '';
          googleId.renderButton(btnElement, {
            theme: 'outline',
            size: 'large',
            width: btnElement.clientWidth || 200,
            text: 'signin_with',
            shape: 'rectangular',
          });
        }

        setIsScriptLoaded(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Không khởi tạo được Google Login.';
        onErrorRef.current(message);
      }
    };

    initAndRender();

    return () => {
      mounted = false;
      const btnElement = document.getElementById(buttonElementId);
      if (btnElement) btnElement.innerHTML = '';
    };
  }, [buttonElementId]);

  return { isScriptLoaded };
};
