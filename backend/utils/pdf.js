const PDFDocument = require('pdfkit');

const generateDeclaracao = async (beneficiaria, oficina) => {
  const doc = new PDFDocument();
  
  // Cabeçalho
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('DECLARAÇÃO DE PARTICIPAÇÃO', {
       align: 'center'
     })
     .moveDown();
  
  // Corpo
  doc.fontSize(12)
     .font('Helvetica')
     .text(`Declaramos para os devidos fins que ${beneficiaria.nome_completo}, ` +
           `portadora do CPF ${beneficiaria.cpf}, participou da oficina ` +
           `"${oficina.titulo}" ministrada no Instituto Move Marias, no período ` +
           `de ${formatDate(oficina.data_inicio)} a ${formatDate(oficina.data_fim)}, ` +
           `com carga horária total de ${oficina.carga_horaria} horas.`, {
             align: 'justify'
           })
     .moveDown(2);
  
  // Local e data
  const hoje = new Date();
  doc.text(`São Paulo, ${formatDate(hoje)}`, {
    align: 'right'
  })
  .moveDown(2);
  
  // Assinatura
  doc.text('_________________________________', {
    align: 'center'
  })
  .moveDown()
  .text('Coordenação Move Marias', {
    align: 'center'
  });
  
  return doc;
};

const generateRelatorioAtividades = async (beneficiaria, atividades) => {
  const doc = new PDFDocument();
  
  // Cabeçalho
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('RELATÓRIO DE ATIVIDADES', {
       align: 'center'
     })
     .moveDown();
  
  // Dados da beneficiária
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('BENEFICIÁRIA')
     .moveDown()
     .font('Helvetica')
     .text(`Nome: ${beneficiaria.nome_completo}`)
     .text(`CPF: ${beneficiaria.cpf}`)
     .moveDown();
  
  // Lista de atividades
  doc.font('Helvetica-Bold')
     .text('ATIVIDADES REALIZADAS')
     .moveDown();
  
  atividades.forEach(atividade => {
    doc.font('Helvetica')
       .text(`- ${atividade.titulo}`)
       .text(`  Período: ${formatDate(atividade.data_inicio)} a ${formatDate(atividade.data_fim)}`)
       .text(`  Situação: ${atividade.status}`)
       .moveDown();
  });
  
  return doc;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

module.exports = {
  generateDeclaracao,
  generateRelatorioAtividades
};
