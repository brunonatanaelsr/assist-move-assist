import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Estender o tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportOptions {
  formato: 'pdf' | 'excel' | 'csv';
  dados: any[];
  filename: string;
  titulo?: string;
  colunas?: string[];
  headers?: string[];
  filtros?: {
    dataInicio?: string;
    dataFim?: string;
    status?: string;
    responsavel?: string;
  };
}

// Função auxiliar para gerar CSV
const gerarCSV = (dados: any[], headers?: string[]): string => {
  if (!dados.length) return '';
  
  const colunas = headers || Object.keys(dados[0]);
  const csvHeaders = colunas.join(',');
  
  const csvRows = dados.map(item => 
    colunas.map(col => {
      const valor = item[col] || '';
      // Escapar vírgulas e aspas
      return typeof valor === 'string' && valor.includes(',') 
        ? `"${valor.replace(/"/g, '""')}"` 
        : valor;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

// Função auxiliar para baixar arquivo
const baixarArquivo = (conteudo: string, filename: string, tipo: string) => {
  const blob = new Blob([conteudo], { type: tipo });
  saveAs(blob, filename);
};

// EXPORTAÇÃO DE BENEFICIÁRIAS
export const exportarBeneficiarias = async (options: ExportOptions) => {
  const { formato, dados, filename, titulo = 'Relatório de Beneficiárias' } = options;
  
  if (!dados.length) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    switch (formato) {
      case 'csv':
        const csvContent = gerarCSV(dados, [
          'nome', 'sobrenome', 'idade', 'telefone', 'email', 
          'profissao', 'estadoCivil', 'rendaFamiliar', 'status'
        ]);
        baixarArquivo(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        break;

      case 'excel':
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        
        // Adicionar dados
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Beneficiárias');
        
        // Adicionar metadados
        const metaData = [
          ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
          ['Total de registros:', dados.length.toString()],
          ['Título:', titulo]
        ];
        const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações');
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(20);
        doc.text(titulo, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        doc.text(`Total de registros: ${dados.length}`, 20, 40);
        
        // Tabela
        const colunas = [
          'Nome', 'Idade', 'Telefone', 'E-mail', 'Profissão', 'Status'
        ];
        
        const linhas = dados.map(item => [
          `${item.nome} ${item.sobrenome || ''}`.trim(),
          item.idade?.toString() || '-',
          item.telefone || '-',
          item.email || '-',
          item.profissao || '-',
          item.status || '-'
        ]);
        
        doc.autoTable({
          head: [colunas],
          body: linhas,
          startY: 50,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        doc.save(`${filename}.pdf`);
        break;
    }
    
    console.log(`Exportação de beneficiárias em ${formato} concluída!`);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

// EXPORTAÇÃO DE PROJETOS
export const exportarProjetos = async (options: ExportOptions) => {
  const { formato, dados, filename, titulo = 'Relatório de Projetos' } = options;
  
  if (!dados.length) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    switch (formato) {
      case 'csv':
        const csvContent = gerarCSV(dados, [
          'nome', 'descricao', 'dataInicio', 'dataFim', 'status', 
          'coordenador', 'vagasTotal', 'vagasOcupadas', 'local'
        ]);
        baixarArquivo(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        break;

      case 'excel':
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Projetos');
        
        const metaData = [
          ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
          ['Total de projetos:', dados.length.toString()],
          ['Título:', titulo]
        ];
        const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações');
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(titulo, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        doc.text(`Total de projetos: ${dados.length}`, 20, 40);
        
        const colunas = [
          'Nome', 'Início', 'Fim', 'Status', 'Coordenador', 'Vagas'
        ];
        
        const linhas = dados.map(item => [
          item.nome || '-',
          item.dataInicio || '-',
          item.dataFim || '-',
          item.status || '-',
          item.coordenador || '-',
          `${item.vagasOcupadas || 0}/${item.vagasTotal || 0}`
        ]);
        
        doc.autoTable({
          head: [colunas],
          body: linhas,
          startY: 50,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        doc.save(`${filename}.pdf`);
        break;
    }
    
    console.log(`Exportação de projetos em ${formato} concluída!`);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

// EXPORTAÇÃO DE OFICINAS
export const exportarOficinas = async (options: ExportOptions) => {
  const { formato, dados, filename, titulo = 'Relatório de Oficinas' } = options;
  
  if (!dados.length) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    switch (formato) {
      case 'csv':
        const csvContent = gerarCSV(dados, [
          'nome', 'instrutor', 'dataInicio', 'dataFim', 'horario',
          'vagasTotal', 'vagasOcupadas', 'local', 'status'
        ]);
        baixarArquivo(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        break;

      case 'excel':
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Oficinas');
        
        const metaData = [
          ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
          ['Total de oficinas:', dados.length.toString()],
          ['Título:', titulo]
        ];
        const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações');
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(titulo, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        doc.text(`Total de oficinas: ${dados.length}`, 20, 40);
        
        const colunas = [
          'Nome', 'Instrutor', 'Período', 'Horário', 'Local', 'Status'
        ];
        
        const linhas = dados.map(item => [
          item.nome || '-',
          item.instrutor || '-',
          `${item.dataInicio || ''} - ${item.dataFim || ''}`,
          item.horario || '-',
          item.local || '-',
          item.status || '-'
        ]);
        
        doc.autoTable({
          head: [colunas],
          body: linhas,
          startY: 50,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        doc.save(`${filename}.pdf`);
        break;
    }
    
    console.log(`Exportação de oficinas em ${formato} concluída!`);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

// EXPORTAÇÃO DE PAEDI
export const exportarPAEDI = async (options: ExportOptions) => {
  const { formato, dados, filename, titulo = 'Relatório PAEDI' } = options;
  
  if (!dados.length) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    switch (formato) {
      case 'csv':
        const csvContent = gerarCSV(dados, [
          'beneficiaria', 'tipoFormulario', 'dataPreenchimento', 
          'responsavel', 'status', 'observacoes'
        ]);
        baixarArquivo(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        break;

      case 'excel':
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PAEDI');
        
        const metaData = [
          ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
          ['Total de formulários:', dados.length.toString()],
          ['Título:', titulo]
        ];
        const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações');
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(titulo, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        doc.text(`Total de formulários: ${dados.length}`, 20, 40);
        
        const colunas = [
          'Beneficiária', 'Tipo', 'Data', 'Responsável', 'Status'
        ];
        
        const linhas = dados.map(item => [
          item.beneficiaria || '-',
          item.tipoFormulario || '-',
          item.dataPreenchimento || '-',
          item.responsavel || '-',
          item.status || '-'
        ]);
        
        doc.autoTable({
          head: [colunas],
          body: linhas,
          startY: 50,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        doc.save(`${filename}.pdf`);
        break;
    }
    
    console.log(`Exportação de PAEDI em ${formato} concluída!`);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

// EXPORTAÇÃO GERAL (para uso em qualquer módulo)
export const exportarDados = async (options: ExportOptions) => {
  const { formato, dados, filename, titulo = 'Relatório de Dados' } = options;
  
  if (!dados.length) {
    alert('Não há dados para exportar');
    return;
  }

  try {
    switch (formato) {
      case 'csv':
        const headers = options.headers || Object.keys(dados[0]);
        const csvContent = gerarCSV(dados, headers);
        baixarArquivo(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
        break;

      case 'excel':
        const worksheet = XLSX.utils.json_to_sheet(dados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
        
        const metaData = [
          ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')],
          ['Total de registros:', dados.length.toString()],
          ['Título:', titulo]
        ];
        const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
        XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Informações');
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        break;

      case 'pdf':
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(titulo, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        doc.text(`Total de registros: ${dados.length}`, 20, 40);
        
        const colunas = options.headers || Object.keys(dados[0]).slice(0, 6);
        const linhas = dados.map(item => 
          colunas.map(col => String(item[col] || '-'))
        );
        
        doc.autoTable({
          head: [colunas],
          body: linhas,
          startY: 50,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        doc.save(`${filename}.pdf`);
        break;
    }
    
    console.log(`Exportação em ${formato} concluída!`);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

  export function exportCSV(data: object[], filename: string) {
    // Simulação de exportação
    return `${filename} exportado`;
  }
