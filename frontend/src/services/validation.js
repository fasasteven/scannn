export function containsEmoji(value) {
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\uFE0F|\u200D/u.test(value || "");
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && !containsEmoji(value);
}

export function isValidPassword(value) {
  return value.length > 8
    && /[A-Z]/.test(value)
    && /[^A-Za-z0-9\s]/.test(value)
    && !containsEmoji(value);
}