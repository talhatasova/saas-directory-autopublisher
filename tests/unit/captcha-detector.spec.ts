/**
 * CAPTCHA and 2FA Challenge Detector Implementation & Unit Specs
 */

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | '2fa_prompt' | 'email_otp';
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}

export class CaptchaChallengeScanner {
  public static scanHtml(html: string): CaptchaDetectionResult {
    // 1. Cloudflare Turnstile
    if (
      html.includes('challenges.cloudflare.com') ||
      html.includes('class="cf-turnstile"') ||
      html.includes("class='cf-turnstile'") ||
      html.includes('data-sitekey') && html.includes('turnstile')
    ) {
      return {
        detected: true,
        type: 'cloudflare_turnstile',
        confidence: 'high',
        details: 'Cloudflare Turnstile challenge widget detected in markup'
      };
    }

    // 2. Google reCAPTCHA
    if (
      html.includes('google.com/recaptcha') ||
      html.includes('class="g-recaptcha"') ||
      html.includes("class='g-recaptcha'") ||
      html.includes('id="g-recaptcha-response"') ||
      html.includes('name="g-recaptcha-response"')
    ) {
      return {
        detected: true,
        type: 'recaptcha',
        confidence: 'high',
        details: 'Google reCAPTCHA iframe or response token field detected'
      };
    }

    // 3. hCaptcha
    if (
      html.includes('hcaptcha.com') ||
      html.includes('class="h-captcha"') ||
      html.includes("class='h-captcha'")
    ) {
      return {
        detected: true,
        type: 'hcaptcha',
        confidence: 'high',
        details: 'hCaptcha challenge container detected'
      };
    }

    // 4. 2FA / OTP Input
    const otpRegex = /<input[^>]*?(?:name|id|placeholder)=["'][^"']*(?:otp|2fa|verification_code|security_code|auth_code)[^"']*["'][^>]*>/i;
    if (otpRegex.test(html)) {
      return {
        detected: true,
        type: '2fa_prompt',
        confidence: 'medium',
        details: '2FA or OTP verification code prompt input field detected'
      };
    }

    return {
      detected: false,
      confidence: 'high'
    };
  }
}

describe('Tier 1 Unit: CAPTCHA & Security Challenge Scanner', () => {
  test('Detects Cloudflare Turnstile iframe and widget classes', () => {
    const html = `
      <div class="form-body">
        <div class="cf-turnstile" data-sitekey="0x4AAAAAA"></div>
        <iframe src="https://challenges.cloudflare.com/turnstile/v0/api.js"></iframe>
      </div>
    `;
    const result = CaptchaChallengeScanner.scanHtml(html);
    expect(result.detected).toBe(true);
    expect(result.type).toBe('cloudflare_turnstile');
    expect(result.confidence).toBe('high');
  });

  test('Detects Google reCAPTCHA widget and container', () => {
    const html = `
      <form>
        <div class="g-recaptcha" data-sitekey="6Lc_mock_key"></div>
        <iframe src="https://www.google.com/recaptcha/api2/anchor"></iframe>
      </form>
    `;
    const result = CaptchaChallengeScanner.scanHtml(html);
    expect(result.detected).toBe(true);
    expect(result.type).toBe('recaptcha');
    expect(result.confidence).toBe('high');
  });

  test('Detects hCaptcha containers', () => {
    const html = `
      <div class="h-captcha" data-sitekey="mock-hcaptcha-key"></div>
      <script src="https://js.hcaptcha.com/1/api.js"></script>
    `;
    const result = CaptchaChallengeScanner.scanHtml(html);
    expect(result.detected).toBe(true);
    expect(result.type).toBe('hcaptcha');
  });

  test('Detects 2FA OTP verification code inputs', () => {
    const html = `
      <div class="verify-step">
        <label>Enter 6-digit OTP code sent to your email:</label>
        <input type="text" name="verification_code" placeholder="Enter 6-digit code" />
      </div>
    `;
    const result = CaptchaChallengeScanner.scanHtml(html);
    expect(result.detected).toBe(true);
    expect(result.type).toBe('2fa_prompt');
  });

  test('Returns clean false for standard forms without security challenges', () => {
    const html = `
      <form action="/submit" method="POST">
        <input type="text" name="product_name" value="PulseMetrics" />
        <input type="url" name="url" value="https://pulsemetrics.io" />
        <button type="submit">Submit</button>
      </form>
    `;
    const result = CaptchaChallengeScanner.scanHtml(html);
    expect(result.detected).toBe(false);
    expect(result.type).toBeUndefined();
  });
});
