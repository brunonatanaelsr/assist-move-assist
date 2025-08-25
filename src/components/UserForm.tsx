import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Tipos de usuário
const tiposUsuario = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-500' },
  { value: 'coordenador', label: 'Coordenador', color: 'bg-blue-500' },
  { value: 'assistente', label: 'Assistente Social', color: 'bg-green-500' },
  { value: 'psicologo', label: 'Psicólogo', color: 'bg-purple-500' },
  { value: 'oficineiro', label: 'Oficineiro', color: 'bg-yellow-500' },
  { value: 'voluntario', label: 'Voluntário', color: 'bg-pink-500' }
];

interface UserFormData {
  nome_completo: string;
  email: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  tipo_usuario: string;
}

interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  initialData?: UserFormData;
}

export default function UserForm({ onSubmit, onCancel, initialData }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(
    initialData || {
      nome_completo: '',
      email: '',
      telefone: '',
      cargo: '',
      departamento: '',
      tipo_usuario: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome_completo">Nome Completo</Label>
        <Input
          id="nome_completo"
          value={formData.nome_completo}
          onChange={e => handleChange('nome_completo', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => handleChange('email', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          value={formData.telefone}
          onChange={e => handleChange('telefone', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cargo">Cargo</Label>
        <Input
          id="cargo"
          value={formData.cargo}
          onChange={e => handleChange('cargo', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departamento">Departamento</Label>
        <Input
          id="departamento"
          value={formData.departamento}
          onChange={e => handleChange('departamento', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo_usuario">Tipo de Usuário</Label>
        <Select
          value={formData.tipo_usuario}
          onValueChange={value => handleChange('tipo_usuario', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {tiposUsuario.map(tipo => (
              <SelectItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar
        </Button>
      </div>
    </form>
  );
};
