export function generateStringExample(key, type=null) {
    if(type) return `your_${key.toLowerCase()} of type '${type}'`;
  return `your_${key.toLowerCase()}`;
}

export function isValidType(value, type) {
  switch (type) {
    case "number":
      return !isNaN(value);
    case "boolean":
      return value === "true" || value === "false";
    case "string":
    default:
      return true;
  }
}

export function isSafeNumber(value) {
  // Reject leading zeros like 00123 (except "0")
  if (/^0\d+/.test(value)) return false;

  // Must be finite number
  const num = Number(value);
  if (!Number.isFinite(num)) return false;

  // Very long numbers are usually IDs
  if (value.length > 9) return false;

  return true;
}