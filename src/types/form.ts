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

export interface FormSection {
  id: number;
  title: string;
  description?: string;
  fields: FormField[];
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

export interface FormSubmissionOutput {
  id: number;
  form_id: number;
  user_id?: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Tipos para seções do formulário
export interface FormSection {
  id: number;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
}

// Tipos para o formulário
export interface Form {
  id: number;
  title: string;
  description?: string;
  sections: FormSection[];
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  published_at?: string;
  expiration_date?: string;
  allow_anonymous: boolean;
  notify_on_submit: boolean;
  notify_email?: string;
  max_submissions?: number;
  submission_count: number;
}

// Tipo para criação/atualização de formulário
export type FormInput = Omit<Form, 
  'id' | 'created_at' | 'updated_at' | 'submission_count'
>;

// Tipos para respostas do formulário
export interface FormAnswer {
  field_id: number;
  value: string | string[];
}

export interface FormSubmission {
  id: number;
  form_id: number;
  beneficiaria_id?: number;
  answers: FormAnswer[];
  submitted_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Tipo para nova submissão
export type FormSubmissionInput = Omit<FormSubmission, 
  'id' | 'submitted_at' | 'ip_address' | 'user_agent'
>;
