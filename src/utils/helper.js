/**
 * Generates a placeholder string for environment variable examples
 * @param {string} key - The environment variable name
 * @param {string|null} [type=null] - The variable type (optional)
 * @returns {string} A placeholder string like "your_database_url" or "your_port of type 'number'"
 */
export function generateStringExample(key, type=null) {
    if(type) return `your_${key.toLowerCase()} of type '${type}'`;
  return `your_${key.toLowerCase()}`;
}

/**
 * Validates if a value matches the expected type for environment variables
 * @param {any} value - The value to validate
 * @param {string} type - Expected type: 'string', 'number', 'boolean', 'array', or 'object'
 * @returns {boolean} True if the value matches the expected type
 */
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

/**
 * Checks if a string value represents a safe number (not an ID or string with leading zeros)
 * @param {string} value - The string value to check
 * @returns {boolean} True if the value is a safe number for type inference
 */
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

/**
 * Infers the item type for an array based on its contents
 * @param {Array} arr - The array to analyze
 * @returns {string} The inferred item type: 'boolean', 'number', or 'string'
 */
export function inferPrimitiveArrayType(arr) {
  if (arr.every((v) => typeof v === "boolean")) return "boolean";
  if (arr.every((v) => typeof v === "number")) return "number";
  return "string";
}

/**
 * Detects the type of an environment variable value
 * @param {any} value - The value to analyze
 * @returns {string} The detected type: 'string', 'number', 'boolean', 'array', or 'object'
 */
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

/**
 * Validates if a value is within the allowed enum values
 * @param {any} value - The value to validate
 * @param {Array} enumValues - Array of allowed values
 * @returns {boolean} True if the value is in the enum or if no enum is provided
 */
export function isEnumValid(value, enumValues) {
  if (!Array.isArray(enumValues)) return true;
  return enumValues.includes(String(value));
}

/**
 * Suggests a fix for an invalid environment variable value
 * @param {string} key - The environment variable name
 * @param {any} value - The current (invalid) value
 * @param {Object} spec - The variable specification
 * @returns {string} A helpful suggestion message
 */
export function suggestFix(key, value, spec) {
  const currentType = detectEnvValueType(value);
  const expectedType = spec.type;
  
  if (currentType === expectedType) {
    return "Value appears to be the correct type but failed validation";
  }

  const suggestions = [];
  
  switch (expectedType) {
    case "number":
      if (currentType === "string") {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          suggestions.push(`Try: ${key}=${numValue}`);
        } else {
          suggestions.push(`${key} should be a number like: ${key}=3000`);
        }
      }
      break;
      
    case "boolean":
      if (currentType === "string") {
        if (value.toLowerCase().includes("yes") || value === "1") {
          suggestions.push(`Try: ${key}=true`);
        } else if (value.toLowerCase().includes("no") || value === "0") {
          suggestions.push(`Try: ${key}=false`);
        } else {
          suggestions.push(`${key} should be true or false`);
        }
      }
      break;
      
    case "array":
      if (currentType === "string" && !value.includes(",") && !value.startsWith("[")) {
        if (spec.delimiter) {
          suggestions.push(`Try: ${key}=${value}${spec.delimiter}item2${spec.delimiter}item3`);
        } else {
          suggestions.push(`Try: ${key}=["${value}","item2","item3"]`);
        }
      }
      break;
      
    case "object":
      if (currentType === "string" && !value.startsWith("{")) {
        suggestions.push(`Try: ${key}={"key":"${value}"}`);
      }
      break;
      
    case "string":
      if (currentType === "number" || currentType === "boolean") {
        suggestions.push(`Try: ${key}="${value}"`);
      }
      break;
  }

  if (spec.enum && spec.enum.length > 0) {
    const closest = findClosestMatch(String(value), spec.enum);
    if (closest) {
      suggestions.push(`Did you mean: ${key}=${closest}?`);
    }
    suggestions.push(`Allowed values: ${spec.enum.join(", ")}`);
  }

  if (spec.example !== undefined) {
    const exampleStr = typeof spec.example === "object" 
      ? JSON.stringify(spec.example) 
      : String(spec.example);
    suggestions.push(`Example: ${key}=${exampleStr}`);
  }

  return suggestions.length > 0 
    ? suggestions.join("\n       ")
    : `Expected ${expectedType}, got ${currentType}`;
}

/**
 * Finds the closest matching string from an array of options
 * @param {string} input - The input string
 * @param {Array<string>} options - Array of possible matches
 * @returns {string|null} The closest match or null
 */
function findClosestMatch(input, options) {
  if (!input || !options.length) return null;
  
  const inputLower = input.toLowerCase();
  
  // Exact match (case insensitive)
  const exact = options.find(opt => opt.toLowerCase() === inputLower);
  if (exact) return exact;
  
  // Starts with
  const startsWith = options.find(opt => opt.toLowerCase().startsWith(inputLower));
  if (startsWith) return startsWith;
  
  // Contains
  const contains = options.find(opt => opt.toLowerCase().includes(inputLower));
  if (contains) return contains;
  
  // Simple Levenshtein distance for typos
  let closest = null;
  let minDistance = Infinity;
  
  for (const option of options) {
    const distance = levenshteinDistance(inputLower, option.toLowerCase());
    if (distance < minDistance && distance <= 2) { // Only suggest if 2 or fewer edits
      minDistance = distance;
      closest = option;
    }
  }
  
  return closest;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}