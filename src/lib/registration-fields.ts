export type FieldType = "text" | "email" | "tel" | "number" | "textarea" | "select" | "checkbox";

export type RegField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  system?: boolean;
  placeholder?: string;
  options?: string[];
};

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export function defaultField(): RegField {
  return {
    id: crypto.randomUUID(),
    label: "New field",
    type: "text",
    required: false,
  };
}

export const MAX_TEXT_LEN = 500;
export const MAX_TEXTAREA_LEN = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^[+()\-\s0-9]{6,20}$/;

/**
 * Validate one field value. Returns null when valid, or a human-readable
 * error string. Used on both client (live inline) and server (before insert).
 */
export function validateField(
  field: RegField,
  raw: string | boolean | undefined,
): string | null {
  if (field.type === "checkbox") {
    if (field.required && raw !== true) return `${field.label} is required`;
    return null;
  }

  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    if (field.required) return `${field.label} is required`;
    return null;
  }

  switch (field.type) {
    case "email":
      if (!EMAIL_RE.test(value)) return "Enter a valid email address";
      if (value.length > 255) return "Email is too long";
      return null;
    case "tel":
      if (!TEL_RE.test(value)) return "Enter a valid phone number";
      return null;
    case "number":
      if (!Number.isFinite(Number(value))) return "Enter a valid number";
      return null;
    case "select":
      if (field.options && field.options.length > 0 && !field.options.includes(value)) {
        return "Select a valid option";
      }
      return null;
    case "textarea":
      if (value.length > MAX_TEXTAREA_LEN)
        return `Keep it under ${MAX_TEXTAREA_LEN} characters`;
      return null;
    case "text":
    default:
      if (value.length > MAX_TEXT_LEN)
        return `Keep it under ${MAX_TEXT_LEN} characters`;
      return null;
  }
}

/**
 * Validate the whole registration payload. Returns a map of fieldId → error.
 * Empty object means valid.
 */
export function validateRegistration(
  fields: RegField[],
  values: Record<string, string | boolean | undefined>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const err = validateField(f, values[f.id]);
    if (err) errors[f.id] = err;
  }
  return errors;
}
