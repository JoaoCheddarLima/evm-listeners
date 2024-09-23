export function generateSessionUUID() {
    return crypto.randomUUID().toString();
}