import { xsrfTokenStore } from './xsrfStore';

export function messageLogger(message: string, data: any) {
    console.log(`${message}`, data);
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };

        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}


export const getXSRFToken = () => {
    let xsrfToken = "";

    const xsrfCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="));
    if (xsrfCookie) {
      xsrfToken = xsrfCookie.split("=")[1];
      messageLogger("XSRF Token retrieved from cookie:", xsrfToken);
      return xsrfToken;
    } else {
      console.error("XSRF Token cookie not found");
    }
  };