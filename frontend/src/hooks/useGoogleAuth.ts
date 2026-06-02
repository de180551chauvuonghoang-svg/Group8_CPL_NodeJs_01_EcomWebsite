import { useEffect, useState } from 'react';

interface UseGoogleAuthProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  buttonElementId: string;
}

export const useGoogleAuth = ({ onSuccess, onError, buttonElementId }: UseGoogleAuthProps) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("VITE_GOOGLE_CLIENT_ID is not configured in Vite environment variables.");
      onError("Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID in your environment file.");
      return;
    }

    const initGoogleGSI = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              onSuccess(response.credential);
            } else {
              onError('Đăng nhập Google thất bại (Không nhận được credential)');
            }
          }
        });

        const btnElement = document.getElementById(buttonElementId);
        if (btnElement) {
          (window as any).google.accounts.id.renderButton(
            btnElement,
            { 
              theme: "outline", 
              size: "large", 
              width: btnElement.clientWidth || 200,
              text: "signin_with",
              shape: "rectangular"
            }
          );
        }
      }
    };

    // If script is already loaded
    if ((window as any).google?.accounts?.id) {
      initGoogleGSI();
      setIsScriptLoaded(true);
    } else {
      // Find or load script
      let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const handleScriptLoad = () => {
        initGoogleGSI();
        setIsScriptLoaded(true);
      };

      script.addEventListener('load', handleScriptLoad);
      const checkInterval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          initGoogleGSI();
          setIsScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 500);

      return () => {
        script.removeEventListener('load', handleScriptLoad);
        clearInterval(checkInterval);
      };
    }
  }, [onSuccess, onError, buttonElementId]);

  return { isScriptLoaded };
};
