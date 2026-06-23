const ALLOWED_TYPES = ["string", "number", "boolean", "array", "object"];
const REQUIRED_KEYS = {
  general: ["desc", "type"],
  type: {
    array: ["delimiter", "itemType"],
  },
};

/**
 * Validates a single variable specification in the envspec schema
 * @param {string} key - The environment variable name
 * @param {Object} spec - The variable specification object
 * @param {string} spec.type - Variable type (string, number, boolean, array, object)
 * @param {boolean} spec.required - Whether the variable is required
 * @param {string} spec.desc - Description of the variable
 * @param {any} [spec.example] - Example value for the variable
 * @param {Array} [spec.enum] - Array of allowed values (string type only)
 * @param {string} [spec.itemType] - Type of array items (array type only)
 * @param {string} [spec.delimiter] - Delimiter for CSV arrays (array type only)
 * @returns {Array<string>} Array of validation error messages
 */
export function validateVar(key, spec) {
  const errors = [];
  if (!spec || typeof spec !== "object") {
    errors.push(`${key}: definition must be an object`);
    return errors;
  }

  // Check if all required general keys are present
  const missingGeneral = REQUIRED_KEYS.general.filter((k) => !(k in spec));
  if (missingGeneral.length > 0) {
    errors.push(`${key}: missing required fields: ${missingGeneral.join(", ")}`);
    return errors;
  }

  // ---- type ----
  if (!ALLOWED_TYPES.includes(spec.type)) {
    errors.push(
      `${key}: invalid type "${spec.type}" (allowed: ${ALLOWED_TYPES.join(
        ", "
      )})`
    );
    return errors;
  }

  // ---- required ----
  if (spec.required != null && typeof spec.required !== "boolean") {
    errors.push(`${key}: required must be boolean`);
  }

  // ---- enum ----
  if (spec.enum != null) {
    if (!Array.isArray(spec.enum)) {
      errors.push(`${key}: enum must be an array`);
    } else if (spec.type !== "string") {
      errors.push(`${key}: enum is only allowed for type "string"`);
    }
  }

  // ---- example ----
  if (spec.example != null && !exampleMatchesType(spec.example, spec)) {
    errors.push(`${key}: example does not match type "${spec.type}"`);
  }

  // ---- array-only rules ----
  if (spec.type === "array") {
    const missingArray = REQUIRED_KEYS.type.array.filter((k) => !(k in spec));
    if (missingArray.length > 0) {
      errors.push(
        `${key}: missing required array fields: ${missingArray.join(", ")}`
      );
      return errors;
    }
    if (spec.itemType && !ALLOWED_TYPES.includes(spec.itemType)) {
      errors.push(`${key}: invalid itemType "${spec.itemType}"`);
    }

    if (spec.delimiter && typeof spec.delimiter !== "string") {
      errors.push(`${key}: delimiter must be a string`);
    }

    if (Array.isArray(spec.example) && spec.itemType) {
      for (const item of spec.example) {
        if (!jsTypeMatches(item, spec.itemType)) {
          errors.push(
            `${key}: example array contains invalid ${spec.itemType} value`
          );
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * Checks if an example value matches the expected type in the specification
 * @param {any} example - The example value to validate
 * @param {Object} spec - The variable specification
 * @param {string} spec.type - The expected type
 * @returns {boolean} True if the example matches the expected type
 */
function exampleMatchesType(example, spec) {
  switch (spec.type) {
    case "string":
      return typeof example === "string";

    case "number":
      return typeof example === "number" && Number.isFinite(example);

    case "boolean":
      return typeof example === "boolean";

    case "object":
      return typeof example === "object" && !Array.isArray(example);

    case "array":
      return Array.isArray(example);

    default:
      return false;
  }
}

/**
 * Checks if a JavaScript value matches the expected primitive type
 * @param {any} value - The value to check
 * @param {string} type - The expected type (string, number, boolean, object, array)
 * @returns {boolean} True if the value matches the expected type
 */
function jsTypeMatches(value, type) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    default:
      return false;
  }
}
