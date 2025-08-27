import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { beneficiariaSchema } from '../../../backend/src/schemas/beneficiaria.schema';
import { InputMask } from '../ui/InputMask';
import { Button } from '../ui/button';
import { useCepService } from '../../hooks/useCepService';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../ui/use-toast';

type FormData = {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
};

interface FormularioBeneficiariaProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
}

export function FormularioBeneficiaria({ onSubmit, initialData }: FormularioBeneficiariaProps) {
  const [step, setStep] = useState(1);
  const { consultaCep } = useCepService();
  const { toast } = useToast();
  const debouncedValidation = useDebounce(async (value: string) => {
    // Validação debounced aqui
  }, 500);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger
  } = useForm<FormData>({
    resolver: joiResolver(beneficiariaSchema),
    defaultValues: initialData
  });

  const cep = watch('cep');

  useEffect(() => {
    if (cep?.replace(/\D/g, '').length === 8) {
      consultaCep(cep).then(data => {
        setValue('endereco', data.logradouro);
        setValue('bairro', data.bairro);
        setValue('cidade', data.localidade);
        setValue('estado', data.uf);
        trigger(['endereco', 'bairro', 'cidade', 'estado']);
      }).catch(() => {
        toast({
          title: 'Erro',
          description: 'CEP não encontrado',
          variant: 'destructive'
        });
      });
    }
  }, [cep, setValue, consultaCep, trigger, toast]);

  const steps = {
    1: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dados Pessoais</h3>
        <InputMask
          label="Nome Completo"
          error={errors.nome_completo?.message}
          {...register('nome_completo')}
        />
        <InputMask
          mask="999.999.999-99"
          label="CPF"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <InputMask
          mask="99/99/9999"
          label="Data de Nascimento"
          error={errors.data_nascimento?.message}
          {...register('data_nascimento')}
        />
        <Button 
          type="button"
          onClick={async () => {
            const isValid = await trigger(['nome_completo', 'cpf', 'data_nascimento']);
            if (isValid) setStep(2);
          }}
        >
          Próximo
        </Button>
      </div>
    ),
    2: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contato</h3>
        <InputMask
          mask="(99) 99999-9999"
          label="Telefone"
          error={errors.telefone?.message}
          {...register('telefone')}
        />
        <InputMask
          label="Email"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex gap-2">
          <Button type="button" onClick={() => setStep(1)}>
            Anterior
          </Button>
          <Button
            type="button"
            onClick={async () => {
              const isValid = await trigger(['telefone', 'email']);
              if (isValid) setStep(3);
            }}
          >
            Próximo
          </Button>
        </div>
      </div>
    ),
    3: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Endereço</h3>
        <InputMask
          mask="99999-999"
          label="CEP"
          error={errors.cep?.message}
          {...register('cep')}
        />
        <InputMask
          label="Endereço"
          error={errors.endereco?.message}
          {...register('endereco')}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputMask
            label="Número"
            error={errors.numero?.message}
            {...register('numero')}
          />
          <InputMask
            label="Complemento"
            error={errors.complemento?.message}
            {...register('complemento')}
          />
        </div>
        <InputMask
          label="Bairro"
          error={errors.bairro?.message}
          {...register('bairro')}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputMask
            label="Cidade"
            error={errors.cidade?.message}
            {...register('cidade')}
          />
          <InputMask
            label="Estado"
            error={errors.estado?.message}
            maxLength={2}
            {...register('estado')}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setStep(2)}>
            Anterior
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    )
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto">
      {steps[step as keyof typeof steps]}
    </form>
  );
}
