const crypto = require('crypto');

// Use JWT_SECRET from env or a fallback as the base for the key
const secret = process.env.JWT_SECRET || 'fallback_secret_keep_it_safe_and_long';
// Deriving a 32-byte key from the secret
const key = crypto.createHash('sha256').update(secret).digest();
const algorithm = 'aes-256-cbc';

/**
 * Encrypts a plain text string into a hex string with IV
 */
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return IV:EncryptedData
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an encrypted hex string (IV:EncryptedData) back to plain text
 */
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return text; // Return as-is if decryption fails
  }
}

module.exports = { encrypt, decrypt };
