import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.SECRET_KEY || '';
if (secretKey.length !== 64) {
    throw new Error('SECRET_KEY environment variable must be 64 hexadecimal characters long.');
}
const key = Buffer.from(secretKey, 'hex');

export function encryptData(data: any): string {
    // Convert data to string if it's not already a string
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    const iv = randomBytes(16);
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decryptData(encryptedData: string): string {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}