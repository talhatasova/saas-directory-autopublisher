import { SupabaseClient } from '@supabase/supabase-js';

export class ProofScreenshotCapture {
  private supabaseClient?: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Encodes screenshot buffer to base64 Data URL or uploads to Supabase storage.
   */
  public async uploadProof(
    buffer: Buffer | Uint8Array | string,
    submissionId: string,
    prefix: string = 'proof'
  ): Promise<string> {
    const timestamp = Date.now();
    const filename = `${submissionId}/${prefix}-${timestamp}.png`;

    if (this.supabaseClient) {
      try {
        let rawBuffer: Buffer;
        if (typeof buffer === 'string') {
          const b64Part = buffer.includes(',') ? buffer.split(',')[1] : buffer;
          rawBuffer = Buffer.from(b64Part ?? '', 'base64');
        } else if (Buffer.isBuffer(buffer)) {
          rawBuffer = buffer;
        } else {
          rawBuffer = Buffer.from(buffer);
        }

        const { data, error } = await this.supabaseClient.storage
          .from('submission-proofs')
          .upload(filename, rawBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (!error && data) {
          const { data: pubData } = this.supabaseClient.storage
            .from('submission-proofs')
            .getPublicUrl(filename);
          return pubData.publicUrl;
        }
      } catch (err) {
        console.warn(`[ProofCapture] Storage upload error, falling back to data URI:`, err);
      }
    }

    // Fallback: return data URI string
    if (typeof buffer === 'string' && buffer.startsWith('data:')) {
      return buffer;
    }
    const b64 = typeof buffer === 'string'
      ? buffer
      : Buffer.isBuffer(buffer)
      ? buffer.toString('base64')
      : Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${b64}`;
  }
}
