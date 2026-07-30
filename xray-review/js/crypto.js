(function (global) {
  "use strict";

  const MAGIC = new TextEncoder().encode("FFENC1");
  const PBKDF2_ITERS = 100000;

  function bytesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  async function deriveKey(password, salt) {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  /**
   * Decrypt an FFENC1 blob to a plaintext ZIP File.
   * Layout: MAGIC(6) + salt(16) + iv(12) + ciphertext+tag
   */
  async function decryptFfencToZipFile(arrayBuffer, password, filename) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 6 + 16 + 12 + 16) {
      throw new Error("Encrypted package is too small or corrupt");
    }
    const magic = bytes.subarray(0, 6);
    if (!bytesEqual(magic, MAGIC)) {
      throw new Error("Not an FFENC1 package");
    }
    const salt = bytes.subarray(6, 22);
    const iv = bytes.subarray(22, 34);
    const ciphertext = bytes.subarray(34);
    const key = await deriveKey(password, salt);
    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );
    } catch (_err) {
      throw new Error("Wrong password or corrupt package");
    }
    const name = (filename || "package.zip").replace(/\.ffenc$/i, ".zip");
    return new File([plain], name, { type: "application/zip" });
  }

  global.XrayReviewCrypto = {
    decryptFfencToZipFile,
    PBKDF2_ITERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
