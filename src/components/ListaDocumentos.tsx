import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDocumentos } from '../hooks/useDocumentos';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical, Download, Trash, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useState } from 'react';

interface ListaDocumentosProps {
  beneficiariaId: number;
}

export function ListaDocumentos({ beneficiariaId }: ListaDocumentosProps) {
  const [showVersoes, setShowVersoes] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  
  const {
    documentos,
    isLoading,
    versoes,
    loadingVersoes,
    download,
    excluir,
    isExcluindo
  } = useDocumentos(beneficiariaId);

  if (isLoading) {
    return <div>Carregando documentos...</div>;
  }

  if (!documentos?.length) {
    return <div>Nenhum documento encontrado.</div>;
  }

  const handleVerVersoes = (docId: number) => {
    setSelectedDocId(docId);
    setShowVersoes(true);
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead>Enviado por</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.nome_arquivo}</TableCell>
              <TableCell>{doc.tipo_documento}</TableCell>
              <TableCell>{doc.categoria}</TableCell>
              <TableCell>{formatFileSize(doc.tamanho)}</TableCell>
              <TableCell>{doc.uploaded_by_nome}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(doc.data_upload), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => download(doc.id, doc.nome_arquivo)}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVerVersoes(doc.id)}>
                      <History className="mr-2 h-4 w-4" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => excluir(doc.id)}
                      className="text-red-600"
                      disabled={isExcluindo}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showVersoes} onOpenChange={setShowVersoes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de Versões</DialogTitle>
            <DialogDescription>
              Lista de todas as versões do documento
            </DialogDescription>
          </DialogHeader>
          
          {loadingVersoes ? (
            <div>Carregando versões...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Modificado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versoes
                  ?.filter(v => v.documento_id === selectedDocId)
                  .map((versao) => (
                    <TableRow key={versao.id}>
                      <TableCell>v{versao.numero_versao}</TableCell>
                      <TableCell>{versao.modificado_por_nome}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(versao.data_modificacao), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </TableCell>
                      <TableCell>{versao.motivo_modificacao || '-'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
