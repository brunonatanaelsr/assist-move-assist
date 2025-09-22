import Excel from 'exceljs';
import { ReportTemplate } from '../types/report';

export async function generateExcel(data: any, template: ReportTemplate, options?: any) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet(template.name);

  // Configuração do cabeçalho
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = template.name;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  let currentRow = 2;

  if (template.description) {
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = template.description;
    currentRow += 2;
  }

  // Métricas
  if (data.metrics) {
    worksheet.getCell(`A${currentRow}`).value = 'Métricas Principais';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    Object.entries(data.metrics).forEach(([key, value]: [string, any]) => {
      worksheet.getCell(`A${currentRow}`).value = key;
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });
    currentRow++;
  }

  // Dados detalhados
  if (data.details) {
    const headers = Object.keys(data.details[0]);
    worksheet.addRow(headers);
    data.details.forEach((row: any) => {
      worksheet.addRow(Object.values(row));
    });
  }

  // Formatar colunas
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Gerar buffer
  return workbook.xlsx.writeBuffer();
}
