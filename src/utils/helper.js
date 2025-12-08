export function generateStringExample(key, type=null) {
    if(type) return `your_${key.toLowerCase()} of type '${type}'`;
  return `your_${key.toLowerCase()}`;
}

export function isValidType(value, type) {
  if (value == null) return false;

  const v = String(value).trim();

  switch (type) {
    case "number":
      return Number.isFinite(Number(v));

    case "boolean":
      return v === "true" || v === "false";

    case "array":
      // JSON array OR CSV fallback
      if (v.startsWith("[") && v.endsWith("]")) {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed);
        } catch {
          return false;
        }
      }
      // allow CSV: a,b,c (must contain at least one comma)
      return v.includes(",");

    case "object":
      if (!v.startsWith("{") || !v.endsWith("}")) return false;
      try {
        const parsed = JSON.parse(v);
        return (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        );
      } catch {
        return false;
      }

    case "string":
    default:
      // If value is already a JS type (from parsed JSON array), check it's actually a string
      // Otherwise, any .env value (which is always a string) is valid
      if (typeof value !== "string") return false;
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

export function inferPrimitiveArrayType(arr) {
  if (arr.every((v) => typeof v === "boolean")) return "boolean";
  if (arr.every((v) => typeof v === "number")) return "number";
  return "string";
}

export function detectEnvValueType(value) {
  const v = String(value).trim();

  if (v === "true" || v === "false") return "boolean";

  if (!isNaN(v) && v !== "") return "number";

  if (v.startsWith("[") && v.endsWith("]")) {
    try {
      if (Array.isArray(JSON.parse(v))) return "array";
    } catch {}
  }

  if (v.startsWith("{") && v.endsWith("}")) {
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed === "object" && !Array.isArray(parsed)) return "object";
    } catch {}
  }

  // Detect CSV arrays (must have comma and no spaces around values suggests array)
  if (v.includes(",") && v.split(",").length > 1) {
    return "array";
  }

  return "string";
}

export function isEnumValid(value, enumValues) {
  if (!Array.isArray(enumValues)) return true;
  return enumValues.includes(String(value));
}