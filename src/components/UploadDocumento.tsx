import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
// Substitui Select avançado por <select> nativo para simplificar
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { useDocumentos } from '../hooks/useDocumentos';

interface UploadDocumentoProps {
  beneficiariaId: number;
  tiposDocumento: Array<{ value: string; label: string }>;
  categorias: Array<{ value: string; label: string }>;
}

export function UploadDocumento({ beneficiariaId, tiposDocumento, categorias }: UploadDocumentoProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, isUploading } = useDocumentos(beneficiariaId);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile || !tipo || !categoria) return;

    await upload(
      {
        file: selectedFile,
        tipo,
        categoria,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedFile(null);
          setTipo('');
          setCategoria('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Upload de Documento</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>
            Selecione um arquivo para fazer upload. Formatos aceitos: PDF, JPEG, PNG.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <select
              className="col-span-4 border rounded p-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
            >
              <option value="" disabled>Selecione o tipo</option>
              {tiposDocumento.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <select
              className="col-span-4 border rounded p-2 text-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            >
              <option value="" disabled>Selecione a categoria</option>
              {categorias.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isUploading || !selectedFile || !tipo || !categoria}>
              {isUploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
