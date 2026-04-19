const API_KEY_PATTERNS = [
  /sk-[A-Za-z0-9_-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /x-api-key\s*[:=]\s*[A-Za-z0-9._-]+/gi,
];

export function redactSensitiveText(input: string, maxLength = 300): string {
  let output = input;
  for (const pattern of API_KEY_PATTERNS) {
    output = output.replace(pattern, "[REDACTED]");
  }
  return output.slice(0, maxLength);
}
