import React from 'react';
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { FormGroup, FormMessage } from "./ui/form";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  className = "",
  children
}) => (
  <FormGroup className={className}>
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    {children}
    {error && <FormMessage variant="error">{error}</FormMessage>}
  </FormGroup>
);

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  placeholder,
  type = "text",
  className,
  disabled
}) => (
  <FormField label={label} error={error} required={required} className={className}>
    <Input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </FormField>
);

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  placeholder,
  rows = 3,
  className,
  disabled
}) => (
  <FormField label={label} error={error} required={required} className={className}>
    <Textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
    />
  </FormField>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
  placeholder = "Selecione...",
  className,
  disabled
}) => (
  <FormField label={label} error={error} required={required} className={className}>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FormField>
);

interface SwitchFieldProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  name,
  checked,
  onChange,
  error,
  className,
  disabled
}) => (
  <FormField label={label} error={error} className={className}>
    <Switch
      name={name}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  </FormField>
);
