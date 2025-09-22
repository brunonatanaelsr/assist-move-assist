export function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
export const onlyDigits = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
};

export const normalizeCPF = (value: string) => onlyDigits(value).slice(0, 11);
export const normalizeTelefone = (value: string) => onlyDigits(value).slice(0, 11);
export const normalizeCEP = (value: string) => onlyDigits(value).slice(0, 8);
export const normalizeCNPJ = (value: string) => onlyDigits(value).slice(0, 14);

export type NormalizerMap = Record<string, (v: any) => any>;

export const applyNormalizers = <T extends Record<string, any>>(data: T, map: NormalizerMap): T => {
  const out: any = { ...data };
  for (const [key, fn] of Object.entries(map)) {
    if (key in out) out[key] = fn(out[key]);
  }
  return out as T;
};

