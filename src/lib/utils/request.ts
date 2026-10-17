import { AppError } from '../errors';

export const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MiB

export interface BoundedJsonOptions {
  maxBytes?: number;
}

/**
 * Reads and parses a JSON request body with a strictly enforced maximum byte size.
 * Enforces size limits early via Content-Length header, and incrementally while
 * consuming the stream (handling chunked transfer encoding or missing Content-Length).
 *
 * @param req NextRequest or Fetch Request
 * @param options BoundedJsonOptions with optional maxBytes override
 * @returns Parsed JSON object of type T
 * @throws AppError 413 VALIDATION_ERROR if the payload exceeds maximum size
 * @throws AppError 400 VALIDATION_ERROR if the body is malformed, aborted, or invalid JSON
 */
export async function readBoundedJson<T = unknown>(
  req: Request,
  options?: BoundedJsonOptions
): Promise<T> {
  // Check if request is already aborted
  if (req.signal?.aborted) {
    throw new AppError('VALIDATION_ERROR', 'Request was aborted', 400);
  }

  const envMax = process.env.MAX_IMPORT_PAYLOAD_BYTES
    ? parseInt(process.env.MAX_IMPORT_PAYLOAD_BYTES, 10)
    : NaN;

  const maxBytes =
    options?.maxBytes ??
    (!Number.isNaN(envMax) && envMax > 0 ? envMax : DEFAULT_MAX_PAYLOAD_BYTES);

  // 1. Fast-path Content-Length header verification
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (Number.isNaN(contentLength) || contentLength < 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid Content-Length header', 400);
    }
    if (contentLength > maxBytes) {
      throw new AppError('VALIDATION_ERROR', 'Payload too large', 413);
    }
  }

  // 2. Incremental bounded stream consumption
  if (req.body && typeof req.body.getReader === 'function') {
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        if (req.signal?.aborted) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors
          }
          throw new AppError('VALIDATION_ERROR', 'Request was aborted', 400);
        }

        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            try {
              await reader.cancel();
            } catch {
              // Ignore reader cancellation errors
            }
            throw new AppError('VALIDATION_ERROR', 'Payload too large', 413);
          }
          chunks.push(value);
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('VALIDATION_ERROR', 'Failed to read request body stream', 400);
    }

    if (totalBytes === 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }

    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder('utf-8').decode(combined);
    if (!text || text.trim() === '') {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }
  } else {
    // Fallback for non-stream Request implementations / mocks
    let text = '';
    try {
      text = await req.text();
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }

    if (!text || text.trim() === '') {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }

    const byteLength = new TextEncoder().encode(text).length;
    if (byteLength > maxBytes) {
      throw new AppError('VALIDATION_ERROR', 'Payload too large', 413);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid JSON request body', 400);
    }
  }
}
