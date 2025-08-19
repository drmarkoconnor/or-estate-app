export const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
};

export const isFeatureEnabled = (key: string, defaultVal = false): boolean => {
  const v = process.env[key];
  if (!v) return defaultVal;
  return v.toLowerCase() === "true" || v === "1";
};
