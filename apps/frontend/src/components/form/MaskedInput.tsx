import React from 'react';
import { Input } from '@/components/ui/input';
import { useMaskedInput } from '@/hooks/useMaskedInput';

type MaskedType = 'cpf' | 'telefone';

type Props = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  mask: MaskedType;
  value?: string;
  onValueChange?: (masked: string, unmasked: string) => void;
};

export function MaskedInput({ mask, value: controlledValue, onValueChange, ...rest }: Props) {
  const { value, setValue, handleChange, unmaskedValue } = useMaskedInput(mask);

  React.useEffect(() => {
    if (controlledValue !== undefined) setValue(controlledValue);
  }, [controlledValue, setValue]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    if (onValueChange) onValueChange(e.target.value, e.target.value.replace(/\D/g, ''));
  };

  return (
    <Input {...rest} value={controlledValue ?? value} onChange={onChange} />
  );
}

export default MaskedInput;

