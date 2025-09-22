// Tipos para campos do formulário
export type FormFieldType = 
  | 'text' 
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cep'
  | 'currency'
  | 'file';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: number;
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'time'
    | 'email'
    | 'phone'
    | 'cpf'
    | 'cep'
    | 'currency'
    | 'file';
  required: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
  order: number;
}

export interface FormInput {
  title: string;
  description?: string;
  sections: FormSection[];
  status: 'draft' | 'active' | 'inactive';
  allow_anonymous: boolean;
  notify_on_submit: boolean;
  notify_email?: string;
  max_submissions?: number;
}

export interface FormSection {
  id: number;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
}

// Saídas opcionais (mantidas simples até termos o backend)
export interface FormOutput extends FormInput {
  id: number;
  created_at: string;
  updated_at: string;
  submission_count: number;
}

export interface FormSubmissionInput {
  form_id: number;
  data: Record<string, any>;
  anonymous?: boolean;
}
