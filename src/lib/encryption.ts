import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-change-this-now-123'; // Must be 32 chars
// Ensure key is 32 bytes. If not, hash it to get 32 bytes.
const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substr(0, 32);

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    if (!text) return '';
    const textParts = text.split(':');
    const ivPart = textParts.shift();
    if (!ivPart) return '';
    const iv = Buffer.from(ivPart, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
