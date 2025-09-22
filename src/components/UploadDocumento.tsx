import { useState, useRef, useEffect } from 'react';
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
import useDocumentos from '../hooks/useDocumentos';

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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const { upload, isUploading } = useDocumentos(beneficiariaId);
  useEffect(() => {
    let id: any;
    if (isUploading) {
      setProgress((p) => (p === null ? 10 : p));
      id = setInterval(() => {
        setProgress((p) => {
          const next = (p ?? 10) + Math.random() * 10;
          return next >= 90 ? 90 : next;
        });
      }, 250);
    } else if (progress !== null) {
      setProgress(100);
      const t = setTimeout(() => setProgress(null), 400);
      return () => clearTimeout(t);
    }
    return () => id && clearInterval(id);
  }, [isUploading]);

  const validateFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PDF, JPEG ou PNG.');
      return false;
    }
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo de 10MB.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (validateFile(file)) setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile || !tipo || !categoria) return;

    setProgress(15);
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
          setProgress(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        onError: () => {
          setProgress(null);
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
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center ${dragOver ? 'border-primary bg-primary/5' : 'border-muted'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file && validateFile(file)) {
                setSelectedFile(file);
              }
            }}
          >
            <p className="text-sm text-muted-foreground">
              Arraste e solte um arquivo aqui, ou clique para selecionar
            </p>
            <div className="mt-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Pré-visualização"
                    className="mx-auto max-h-40 rounded"
                  />
                ) : (
                  <span className="text-muted-foreground">{selectedFile.name}</span>
                )}
              </div>
            )}
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
            {progress !== null && (
              <div className="mt-3">
                <div className="h-2 w-full bg-muted rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enviando...</p>
              </div>
            )}
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
