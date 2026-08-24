import { ActionRequiredPayload, ActionRequiredType } from '@saas-autopublisher/shared';

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: ActionRequiredType;
  actionPayload?: ActionRequiredPayload;
  confidence: number;
}

export class CaptchaDetector {
  /**
   * Scans an HTML string or text content for known CAPTCHA signatures and 2FA widgets.
   */
  public static detectInHtml(html: string): CaptchaDetectionResult {
    if (!html) {
      return { detected: false, confidence: 0 };
    }

    const lower = html.toLowerCase();

    // 1. Cloudflare Turnstile
    if (
      lower.includes('cf-turnstile') ||
      lower.includes('challenges.cloudflare.com/turnstile') ||
      (lower.includes('data-sitekey') && lower.includes('turnstile'))
    ) {
      return {
        detected: true,
        type: 'turnstile',
        confidence: 0.95,
        actionPayload: {
          type: 'turnstile',
          captchaType: 'turnstile',
          prompt: 'Cloudflare Turnstile challenge detected. Please complete the verification in your browser.',
        },
      };
    }

    // 2. Google reCAPTCHA
    if (
      lower.includes('g-recaptcha') ||
      lower.includes('google.com/recaptcha') ||
      lower.includes('recaptcha/api.js') ||
      lower.includes('grecaptcha.execute')
    ) {
      return {
        detected: true,
        type: 'recaptcha',
        confidence: 0.95,
        actionPayload: {
          type: 'recaptcha',
          captchaType: 'recaptcha',
          prompt: 'Google reCAPTCHA verification required. Please solve the challenge to continue.',
        },
      };
    }

    // 3. hCaptcha
    if (
      lower.includes('h-captcha') ||
      lower.includes('hcaptcha.com/1/api.js') ||
      lower.includes('data-hcaptcha')
    ) {
      return {
        detected: true,
        type: 'hcaptcha',
        confidence: 0.95,
        actionPayload: {
          type: 'hcaptcha',
          captchaType: 'hcaptcha',
          prompt: 'hCaptcha security check detected. Please complete the challenge.',
        },
      };
    }

    // 4. OTP / 2FA Email Code
    if (
      lower.includes('verification code') ||
      lower.includes('enter the 6-digit code') ||
      lower.includes('two-factor authentication') ||
      lower.includes('enter otp')
    ) {
      return {
        detected: true,
        type: '2fa_code',
        confidence: 0.85,
        actionPayload: {
          type: '2fa_code',
          prompt: 'Two-factor authentication code required. Please enter the verification code sent to your email/phone.',
        },
      };
    }

    return { detected: false, confidence: 0 };
  }
}
