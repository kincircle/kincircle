export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function expectRecord(
  value: unknown,
  context: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    console.error(`[${context}] Expected object response`, value);
    throw new Error(`Invalid ${context} response`);
  }

  return value;
}

export function expectArray<T>(value: unknown, context: string): T[] {
  if (!Array.isArray(value)) {
    console.error(`[${context}] Expected array response`, value);
    throw new Error(`Invalid ${context} response`);
  }

  return value as T[];
}

export function expectArrayField<T>(
  value: unknown,
  field: string,
  context: string
): T[] {
  const record = expectRecord(value, context);
  const fieldValue = record[field];

  if (!Array.isArray(fieldValue)) {
    console.error(`[${context}] Expected array field "${field}"`, value);
    throw new Error(`Invalid ${context} response`);
  }

  return fieldValue as T[];
}
