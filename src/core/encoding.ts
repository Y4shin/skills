/**
 * Text decoding for files a human may have written.
 *
 * Editable markdown on Windows is not always UTF-8: Notepad saves "UTF-8 with
 * BOM", and Windows PowerShell 5.1 writes UTF-16LE by default (`>`, `Out-File`,
 * `Set-Content`). Decoding those bytes as plain UTF-8 yields replacement
 * characters, and any rewrite through the migration then persists the damage.
 * Decode the byte-order mark first, so the text is correct before anything
 * writes it back.
 *
 * The bytes are the same on every platform, so this is the one seam where a
 * Windows-authored file is recognised on Linux and macOS too.
 */

const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return false;
  return true;
}

/** Strip a leading U+FEFF a port already decoded into the string. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Normalise CRLF and lone CR line endings to LF.
 *
 * Windows editors and PowerShell write CRLF. Splitting such a document on
 * "\n" leaves a trailing "\r" on every line, and the last frontmatter line
 * has no "\n" after it at all, so its value would keep the carriage return and
 * quietly break every status comparison. The package writes LF, so normalising
 * on read keeps a CRLF checkout stable byte for byte once an artifact is
 * rewritten.
 */
export function normalizeNewlines(text: string): string {
  return text.includes("\r") ? text.replace(/\r\n?/g, "\n") : text;
}

/**
 * Decode file bytes to text, honouring a UTF-8, UTF-16LE, or UTF-16BE
 * byte-order mark. Bytes with no BOM decode as UTF-8, which is what every
 * other writer in this package produces.
 */
export function decodeText(bytes: Uint8Array): string {
  const buf = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (startsWith(buf, UTF8_BOM)) return stripBom(buf.toString("utf8", UTF8_BOM.length));
  if (startsWith(buf, UTF16LE_BOM)) return stripBom(buf.toString("utf16le", UTF16LE_BOM.length));
  if (startsWith(buf, UTF16BE_BOM)) return stripBom(decodeUtf16Be(buf.subarray(UTF16BE_BOM.length)));

  return stripBom(buf.toString("utf8"));
}

/** Node decodes UTF-16LE only, so swap the byte pairs of a big-endian body. */
function decodeUtf16Be(body: Buffer): string {
  const even = body.length - (body.length % 2);
  const swapped = Buffer.allocUnsafe(even);
  for (let i = 0; i < even; i += 2) {
    swapped[i] = body[i + 1];
    swapped[i + 1] = body[i];
  }
  return swapped.toString("utf16le");
}
