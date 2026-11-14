export const maskEmail = (e?: string | null) => (e ? e.replace(/^(.).*?(@.*)$/, "$1***$2") : null);
