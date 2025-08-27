import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useCriarForm, useAtualizarForm } from '@/hooks/useForms';
import { FormInput, FormSection, FormField } from '@/types/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  ChevronLeft,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { Loading } from '@/components/ui/loading';

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção' },
  { value: 'multiselect', label: 'Seleção Múltipla' },
  { value: 'radio', label: 'Escolha Única' },
  { value: 'checkbox', label: 'Caixas de Seleção' },
  { value: 'date', label: 'Data' },
  { value: 'time', label: 'Hora' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cep', label: 'CEP' },
  { value: 'currency', label: 'Valor Monetário' },
  { value: 'file', label: 'Arquivo' },
];

const initialFormData: FormInput = {
  title: '',
  description: '',
  sections: [],
  status: 'draft',
  allow_anonymous: false,
  notify_on_submit: false,
};

const initialSection: Omit<FormSection, 'id'> = {
  title: '',
  description: '',
  fields: [],
  order: 0,
};

const initialField: Omit<FormField, 'id'> = {
  name: '',
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  helperText: '',
  defaultValue: '',
  options: [],
  order: 0,
};

export function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingForm, isLoading: loadingForm } = useForm(Number(id));
  const criarForm = useCriarForm();
  const atualizarForm = useAtualizarForm(Number(id));

  const [formData, setFormData] = useState<FormInput>(
    existingForm || initialFormData
  );
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(
    null
  );
  const [editingFieldIndex, setEditingFieldIndex] = useState<{
    sectionIndex: number;
    fieldIndex: number;
  } | null>(null);
  const [newSection, setNewSection] = useState(initialSection);
  const [newField, setNewField] = useState(initialField);

  // Funções de manipulação do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      await atualizarForm.mutateAsync(formData);
    } else {
      await criarForm.mutateAsync(formData);
    }
    
    navigate('/forms');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Funções de manipulação das seções
  const handleAddSection = () => {
    const newSectionWithId = {
      ...newSection,
      id: Date.now(),
      order: formData.sections.length,
    };
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSectionWithId],
    }));
    setNewSection(initialSection);
  };

  const handleEditSection = (index: number) => {
    setEditingSectionIndex(index);
    setNewSection(formData.sections[index]);
  };

  const handleUpdateSection = () => {
    if (editingSectionIndex === null) return;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === editingSectionIndex ? { ...section, ...newSection } : section
      ),
    }));
    setEditingSectionIndex(null);
    setNewSection(initialSection);
  };

  const handleRemoveSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  // Funções de manipulação dos campos
  const handleAddField = (sectionIndex: number) => {
    const newFieldWithId = {
      ...newField,
      id: Date.now(),
      order: formData.sections[sectionIndex].fields.length,
    };
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, fields: [...section.fields, newFieldWithId] }
          : section
      ),
    }));
    setNewField(initialField);
  };

  const handleEditField = (sectionIndex: number, fieldIndex: number) => {
    setEditingFieldIndex({ sectionIndex, fieldIndex });
    setNewField(formData.sections[sectionIndex].fields[fieldIndex]);
  };

  const handleUpdateField = () => {
    if (!editingFieldIndex) return;
    const { sectionIndex, fieldIndex } = editingFieldIndex;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, fIndex) =>
                fIndex === fieldIndex ? { ...field, ...newField } : field
              ),
            }
          : section
      ),
    }));
    setEditingFieldIndex(null);
    setNewField(initialField);
  };

  const handleRemoveField = (sectionIndex: number, fieldIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.filter((_, i) => i !== fieldIndex),
            }
          : section
      ),
    }));
  };

  // Funções de drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const [sourceType, sourceSection] = source.droppableId.split('-');
    const [destType, destSection] = destination.droppableId.split('-');

    if (sourceType === 'section') {
      // Reordenar seções
      const sections = Array.from(formData.sections);
      const [removed] = sections.splice(source.index, 1);
      sections.splice(destination.index, 0, removed);
      sections.forEach((section, index) => {
        section.order = index;
      });
      setFormData((prev) => ({ ...prev, sections }));
    } else if (sourceType === 'field') {
      // Reordenar campos
      const sourceSectionIndex = parseInt(sourceSection);
      const destSectionIndex = parseInt(destSection);

      const newSections = Array.from(formData.sections);
      const sourceFields = Array.from(newSections[sourceSectionIndex].fields);
      const [removed] = sourceFields.splice(source.index, 1);

      if (sourceSectionIndex === destSectionIndex) {
        // Mesmo seção
        sourceFields.splice(destination.index, 0, removed);
        sourceFields.forEach((field, index) => {
          field.order = index;
        });
        newSections[sourceSectionIndex].fields = sourceFields;
      } else {
        // Seções diferentes
        const destFields = Array.from(newSections[destSectionIndex].fields);
        destFields.splice(destination.index, 0, removed);
        destFields.forEach((field, index) => {
          field.order = index;
        });
        newSections[sourceSectionIndex].fields = sourceFields;
        newSections[destSectionIndex].fields = destFields;
      }

      setFormData((prev) => ({ ...prev, sections: newSections }));
    }
  };

  if (isEditing && loadingForm) {
    return <Loading message="Carregando formulário..." />;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/forms')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Formulário' : 'Novo Formulário'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Configure as informações gerais do formulário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Formulário</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow_anonymous"
                    name="allow_anonymous"
                    checked={formData.allow_anonymous}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        allow_anonymous: e.target.checked,
                      }))
                    }
                  />
                  <Label htmlFor="allow_anonymous">
                    Permitir respostas anônimas
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify_on_submit"
                    name="notify_on_submit"
                    checked={formData.notify_on_submit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notify_on_submit: e.target.checked,
                      }))
                    }
                  />
                  <Label htmlFor="notify_on_submit">
                    Notificar por e-mail ao receber resposta
                  </Label>
                </div>
              </div>

              {formData.notify_on_submit && (
                <div className="space-y-2">
                  <Label htmlFor="notify_email">E-mail para notificações</Label>
                  <Input
                    type="email"
                    id="notify_email"
                    name="notify_email"
                    value={formData.notify_email}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="max_submissions">
                  Limite de Respostas (opcional)
                </Label>
                <Input
                  type="number"
                  id="max_submissions"
                  name="max_submissions"
                  value={formData.max_submissions}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seções e Campos */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            <Droppable droppableId="section-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {formData.sections.map((section, sectionIndex) => (
                    <Draggable
                      key={section.id}
                      draggableId={`section-${section.id}`}
                      index={sectionIndex}
                    >
                      {(provided) => (
                        <Card
                          className="mb-4"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <CardHeader
                            className="cursor-move"
                            {...provided.dragHandleProps}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle>{section.title}</CardTitle>
                                {section.description && (
                                  <CardDescription>
                                    {section.description}
                                  </CardDescription>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSection(sectionIndex)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSection(sectionIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Droppable droppableId={`field-${sectionIndex}`}>
                              {(provided) => (
                                <div
                                  className="space-y-4"
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                >
                                  {section.fields.map((field, fieldIndex) => (
                                    <Draggable
                                      key={field.id}
                                      draggableId={`field-${field.id}`}
                                      index={fieldIndex}
                                    >
                                      {(provided) => (
                                        <div
                                          className="flex items-center gap-4 p-4 border rounded-lg bg-background"
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                        >
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {field.label}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {
                                                FIELD_TYPES.find(
                                                  (t) => t.value === field.type
                                                )?.label
                                              }
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleEditField(
                                                  sectionIndex,
                                                  fieldIndex
                                                )
                                              }
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleRemoveField(
                                                  sectionIndex,
                                                  fieldIndex
                                                )
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-4"
                              onClick={() => handleAddField(sectionIndex)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar Campo
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <Button type="button" onClick={() => setEditingSectionIndex(-1)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Seção
            </Button>
          </div>
        </DragDropContext>

        {/* Botões de Ação */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/forms')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={criarForm.isPending || atualizarForm.isPending}
          >
            {criarForm.isPending || atualizarForm.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar Formulário'
              : 'Criar Formulário'}
          </Button>
        </div>
      </form>

      {/* Modal de Seção */}
      <Dialog
        open={editingSectionIndex !== null}
        onOpenChange={() => setEditingSectionIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSectionIndex === -1
                ? 'Nova Seção'
                : 'Editar Seção'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Título da Seção</Label>
              <Input
                id="section-title"
                value={newSection.title}
                onChange={(e) =>
                  setNewSection((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-description">Descrição</Label>
              <Textarea
                id="section-description"
                value={newSection.description}
                onChange={(e) =>
                  setNewSection((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingSectionIndex(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={
                editingSectionIndex === -1
                  ? handleAddSection
                  : handleUpdateSection
              }
            >
              {editingSectionIndex === -1 ? 'Adicionar' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Campo */}
      <Dialog
        open={editingFieldIndex !== null}
        onOpenChange={() => setEditingFieldIndex(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFieldIndex ? 'Editar Campo' : 'Novo Campo'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Rótulo do Campo</Label>
              <Input
                id="field-label"
                value={newField.label}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    label: e.target.value,
                    name: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '_'),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Tipo do Campo</Label>
              <Select
                value={newField.type}
                onValueChange={(value) =>
                  setNewField((prev) => ({
                    ...prev,
                    type: value as any,
                    options: ['select', 'multiselect', 'radio', 'checkbox'].includes(
                      value
                    )
                      ? []
                      : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={newField.placeholder}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    placeholder: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-default">Valor Padrão</Label>
              <Input
                id="field-default"
                value={newField.defaultValue}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    defaultValue: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="field-helper">Texto de Ajuda</Label>
              <Input
                id="field-helper"
                value={newField.helperText}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    helperText: e.target.value,
                  }))
                }
              />
            </div>

            {['select', 'multiselect', 'radio', 'checkbox'].includes(
              newField.type
            ) && (
              <div className="col-span-2 space-y-2">
                <Label>Opções</Label>
                <div className="space-y-2">
                  {newField.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) =>
                          setNewField((prev) => ({
                            ...prev,
                            options: prev.options?.map((o, i) =>
                              i === index
                                ? {
                                    value: e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9]/g, '_'),
                                    label: e.target.value,
                                  }
                                : o
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setNewField((prev) => ({
                            ...prev,
                            options: prev.options?.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setNewField((prev) => ({
                        ...prev,
                        options: [
                          ...(prev.options || []),
                          { value: '', label: '' },
                        ],
                      }))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Opção
                  </Button>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={newField.required}
                    onChange={(e) =>
                      setNewField((prev) => ({
                        ...prev,
                        required: e.target.checked,
                      }))
                    }
                  />
                  <Label htmlFor="field-required">Campo obrigatório</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingFieldIndex(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={
                !editingFieldIndex
                  ? () =>
                      handleAddField(
                        editingFieldIndex?.sectionIndex || 0
                      )
                  : handleUpdateField
              }
            >
              {!editingFieldIndex ? 'Adicionar' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
