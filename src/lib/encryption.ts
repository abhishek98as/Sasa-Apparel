import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-change-this-now-123';
// Ensure key is 32 bytes for AES-256
const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a string using AES-256-CBC encryption
 * @param text - The plain text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
    if (!text) return '';
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts a string encrypted with the encrypt function
 * @param text - The encrypted string in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(text: string): string {
    if (!text) return '';
    try {
        const textParts = text.split(':');
        const ivPart = textParts.shift();
        if (!ivPart) return '';
        const iv = Buffer.from(ivPart, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption error:', error);
        return '';
    }
}

/**
 * Hashes a password using bcrypt (for user passwords)
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
}

/**
 * Verifies a password against a bcrypt hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * Creates a secure hash of data using SHA-256 (for checksums/integrity)
 * @param data - Data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a random token (for authentication tokens, API keys, etc.)
 * @param length - Length of the token in bytes (default 32)
 * @returns Hex-encoded random token
 */
export function generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}
