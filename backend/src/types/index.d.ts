// Custom type definitions for the project
declare module 'brazilian-values' {
  export function isCPF(cpf: string): boolean;
  export function formatCPF(cpf: string): string;
  export function formatPhone(phone: string): string;
}

// Extend express Request
declare namespace Express {
  interface Request {
    user?: {
      id: number;
      role: string;
    };
  }
}
