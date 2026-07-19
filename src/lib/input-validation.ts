const DEFAULT_TEXT_MAX_LENGTH = 255;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredText(
  value: unknown,
  label: string,
  maxLength = DEFAULT_TEXT_MAX_LENGTH,
) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} é obrigatório.`);
  if (text.length > maxLength) {
    throw new Error(`${label} deve ter no maximo ${maxLength} caracteres.`);
  }
  return text;
}

export function optionalText(
  value: unknown,
  label: string,
  maxLength = DEFAULT_TEXT_MAX_LENGTH,
) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new Error(`${label} deve ter no maximo ${maxLength} caracteres.`);
  }
  return text;
}

export function requiredId(value: unknown, label: string) {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`${label} é obrigatório.`);
  if (!ID_PATTERN.test(id)) throw new Error(`${label} inválido.`);
  return id;
}

export function optionalId(value: unknown, label: string) {
  const id = String(value ?? "").trim();
  if (!id || id === "none") return null;
  if (!ID_PATTERN.test(id)) throw new Error(`${label} inválido.`);
  return id;
}

export function requiredEmail(value: unknown, label = "E-mail") {
  const email = requiredText(value, label, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error(`${label} inválido.`);
  return email;
}

export function optionalNumber(
  value: unknown,
  label: string,
  options: { min?: number; max?: number } = {},
) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw.replace(",", "."));
  if (!Number.isFinite(number)) throw new Error(`${label} inválido.`);
  if (options.min !== undefined && number < options.min) {
    throw new Error(`${label} deve ser maior ou igual a ${options.min}.`);
  }
  if (options.max !== undefined && number > options.max) {
    throw new Error(`${label} deve ser menor ou igual a ${options.max}.`);
  }
  return number;
}

export function requiredNumber(
  value: unknown,
  label: string,
  options: { min?: number; max?: number } = {},
) {
  const number = optionalNumber(value, label, options);
  if (number === null) throw new Error(`${label} é obrigatório.`);
  return number;
}

export function enumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  label: string,
) {
  const text = String(value ?? "").trim();
  if (!allowedValues.includes(text as T)) throw new Error(`${label} inválido.`);
  return text as T;
}

export function optionalDate(value: unknown, label: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`${label} inválida.`);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválida.`);
  return date;
}
