import { createHash } from 'crypto';

export function encriptData(data: string) {
    const hash = createHash('sha1')

    hash.update(data + process.env.SECRET_KEY);

    const encryptedMessage = hash.digest('hex');

    return encryptedMessage;
}

export function decriptData(data: string) {
    const hash = createHash('sha1')

    hash.update(data + process.env.SECRET_KEY);

    const encryptedMessage = hash.digest('hex');

    return encryptedMessage;
}