import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2 } from 'lucide-react';

// Configurar worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.1, 2.0));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  const resetZoom = () => setScale(1.0);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center gap-2 w-full max-w-xl">
        <Button
          onClick={previousPage}
          disabled={pageNumber <= 1}
          variant="outline"
        >
          ←
        </Button>
        
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span>
            Página {pageNumber} de {numPages}
          </span>
          <Input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={e => {
              const value = parseInt(e.target.value);
              if (value >= 1 && value <= numPages) {
                setPageNumber(value);
              }
            }}
            className="w-20"
          />
        </div>

        <Button
          onClick={nextPage}
          disabled={pageNumber >= numPages}
          variant="outline"
        >
          →
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={zoomOut} variant="outline" title="Diminuir zoom">
          -
        </Button>
        <Button onClick={resetZoom} variant="outline" title="Resetar zoom">
          {Math.round(scale * 100)}%
        </Button>
        <Button onClick={zoomIn} variant="outline" title="Aumentar zoom">
          +
        </Button>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-inner min-h-[600px] flex items-center justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando PDF...
            </div>
          }
          error={
            <div className="text-red-500">
              Erro ao carregar o PDF. Tente novamente.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando página...
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
}
