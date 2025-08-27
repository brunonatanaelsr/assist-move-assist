import { useParams } from 'react-router-dom';
import { useForm } from '@/hooks/useForms';
import { useEnviarResposta } from '@/hooks/useFormSubmissions';
import { FormField as FormFieldType } from '@/types/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function FormField({ field, value, onChange, error }: {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'cpf':
    case 'cep':
      return (
        <Input
          id={field.name}
          type={field.type === 'text' ? 'text' : 'email'}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={cn(error && 'border-destructive')}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={field.name}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={cn(error && 'border-destructive')}
        />
      );

    case 'number':
    case 'currency':
      return (
        <Input
          id={field.name}
          type="number"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          step={field.type === 'currency' ? '0.01' : '1'}
          className={cn(error && 'border-destructive')}
        />
      );

    case 'date':
    case 'time':
      return (
        <Input
          id={field.name}
          type={field.type}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={cn(error && 'border-destructive')}
        />
      );

    case 'select':
      return (
        <Select
          value={value || ''}
          onValueChange={onChange}
          required={field.required}
        >
          <SelectTrigger className={cn(error && 'border-destructive')}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={`${field.name}-${option.value}`}
                name={field.name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
                className={cn(error && 'border-destructive')}
              />
              <Label htmlFor={`${field.name}-${option.value}`}>
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${field.name}-${option.value}`}
                name={field.name}
                value={option.value}
                checked={(value || []).includes(option.value)}
                onChange={(e) => {
                  const newValue = e.target.checked
                    ? [...(value || []), option.value]
                    : (value || []).filter((v: string) => v !== option.value);
                  onChange(newValue);
                }}
                required={field.required && !value?.length}
                className={cn(error && 'border-destructive')}
              />
              <Label htmlFor={`${field.name}-${option.value}`}>
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );

    case 'file':
      return (
        <Input
          id={field.name}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onChange(file);
            }
          }}
          required={field.required}
          className={cn(error && 'border-destructive')}
        />
      );

    default:
      return null;
  }
}

export function FormView() {
  const { id } = useParams<{ id: string }>();
  const { data: formData, isLoading: loadingForm } = useForm(Number(id));
  const enviarResposta = useEnviarResposta();

  const [step, setStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (loadingForm) {
    return <Loading message="Carregando formulário..." />;
  }

  if (!formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Formulário não encontrado</h1>
        <p className="text-muted-foreground">
          O formulário que você está procurando não existe ou foi removido.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <CheckCircle2 className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-4">Resposta enviada!</h1>
        <p className="text-muted-foreground">
          Obrigado por responder o formulário.
        </p>
      </div>
    );
  }

  const currentSection = formData.sections[step];

  const validateFields = (fields: FormFieldType[]) => {
    const errors: Record<string, string> = {};
    
    fields.forEach((field) => {
      const value = formValues[field.name];

      if (field.required) {
        if (value === undefined || value === '' || value === null) {
          errors[field.name] = 'Este campo é obrigatório';
        }

        if (Array.isArray(value) && value.length === 0) {
          errors[field.name] = 'Este campo é obrigatório';
        }
      }

      // Validações específicas por tipo
      if (value) {
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors[field.name] = 'Email inválido';
            }
            break;

          case 'phone':
            if (!/^\(\d{2}\) \d{4,5}-\d{4}$/.test(value)) {
              errors[field.name] = 'Telefone inválido';
            }
            break;

          case 'cpf':
            if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
              errors[field.name] = 'CPF inválido';
            }
            break;

          case 'cep':
            if (!/^\d{5}-\d{3}$/.test(value)) {
              errors[field.name] = 'CEP inválido';
            }
            break;
        }
      }
    });

    return errors;
  };

  const handleNextStep = () => {
    const errors = validateFields(currentSection.fields);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Por favor, corrija os erros antes de continuar');
      return;
    }

    if (step < formData.sections.length - 1) {
      setStep(step + 1);
      setFormErrors({});
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      await enviarResposta.mutateAsync({
        form_id: Number(id),
        data: formValues,
      });
      setSubmitted(true);
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{formData.title}</h1>
        {formData.description && (
          <p className="text-muted-foreground">{formData.description}</p>
        )}

        {/* Progresso */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Seção {step + 1} de {formData.sections.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((step + 1) / formData.sections.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${((step + 1) / formData.sections.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Seção Atual */}
      <Card>
        <CardHeader>
          <CardTitle>{currentSection.title}</CardTitle>
          {currentSection.description && (
            <CardDescription>{currentSection.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {currentSection.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              <FormField
                field={field}
                value={formValues[field.name]}
                onChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [field.name]: value,
                  }))
                }
                error={formErrors[field.name]}
              />
              {field.helperText && (
                <p className="text-sm text-muted-foreground">
                  {field.helperText}
                </p>
              )}
              {formErrors[field.name] && (
                <p className="text-sm text-destructive">
                  {formErrors[field.name]}
                </p>
              )}
            </div>
          ))}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setStep(step - 1);
              setFormErrors({});
            }}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={enviarResposta.isPending}
          >
            {enviarResposta.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step < formData.sections.length - 1 ? (
              <>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Enviar'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
