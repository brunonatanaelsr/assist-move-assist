import { stringify } from 'csv-stringify';
import { ReportTemplate } from '../types/report';

export async function generateCSV(data: any, template: ReportTemplate, options?: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    // Adicionar cabeçalho com nome do relatório
    rows.push(['Relatório:', template.name]);
    if (template.description) {
      rows.push(['Descrição:', template.description]);
    }
    rows.push([]);  // Linha em branco

    // Adicionar métricas
    if (data.metrics) {
      rows.push(['Métricas Principais']);
      Object.entries(data.metrics).forEach(([key, value]: [string, any]) => {
        rows.push([key, value]);
      });
      rows.push([]);  // Linha em branco
    }

    // Adicionar dados detalhados
    if (data.details) {
      const headers = Object.keys(data.details[0]);
      rows.push(headers);
      data.details.forEach((item: any) => {
        rows.push(Object.values(item));
      });
    }

    // Converter para CSV
    stringify(rows, {
      header: false,
      delimiter: ',',
    }, (err, output) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(Buffer.from(output));
    });
  });
}
