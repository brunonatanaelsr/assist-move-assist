import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Grid,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as ExportIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useReports } from '../hooks/useReports';
import { ReportTemplate, ExportFormat } from '../types/report';

export default function ReportTemplatesPage() {
  const {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    exportReport
  } = useReports();

  const { data: templates, isLoading } = getTemplates();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportTemplateId, setExportTemplateId] = useState<number | null>(null);

  const handleAddTemplate = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async (template: ReportTemplate) => {
    if (selectedTemplate) {
      await updateTemplate.mutateAsync({ id: selectedTemplate.id, ...template });
    } else {
      await createTemplate.mutateAsync(template);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  const handleExport = (templateId: number) => {
    setExportTemplateId(templateId);
    setIsExportDialogOpen(true);
  };

  const handleConfirmExport = async (format: ExportFormat) => {
    if (exportTemplateId) {
      await exportReport(exportTemplateId, format);
      setIsExportDialogOpen(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Templates de Relatórios</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddTemplate}
        >
          Novo Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        {templates?.map((template) => (
          <Grid item xs={12} md={4} key={template.id}>
            <Card sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{template.name}</Typography>
                  <Typography color="textSecondary" variant="body2">
                    {template.description}
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={template.type}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {template.schedule && (
                      <Chip
                        label={`Agendado: ${template.schedule.frequency}`}
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleExport(template.id)}
                  >
                    <ExportIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Box mt={2}>
                <Typography variant="subtitle2">Métricas:</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {template.metrics.map((metric, index) => (
                    <Chip
                      key={index}
                      label={metric}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog de Template */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? 'Editar Template' : 'Novo Template'}
        </DialogTitle>
        <DialogContent>
          <Box p={2}>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              defaultValue={selectedTemplate?.name}
            />
            <TextField
              fullWidth
              label="Descrição"
              margin="normal"
              multiline
              rows={3}
              defaultValue={selectedTemplate?.description}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={selectedTemplate?.type || 'DASHBOARD'}
                label="Tipo"
              >
                <MenuItem value="DASHBOARD">Dashboard</MenuItem>
                <MenuItem value="PROJECT">Projeto</MenuItem>
                <MenuItem value="FORM">Formulário</MenuItem>
                <MenuItem value="REGIONAL">Regional</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleSaveTemplate(selectedTemplate || {} as ReportTemplate)}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Exportação */}
      <Dialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      >
        <DialogTitle>Exportar Relatório</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Formato</InputLabel>
            <Select
              defaultValue="pdf"
              label="Formato"
            >
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="xlsx">Excel</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsExportDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleConfirmExport({ type: 'pdf' })}
          >
            Exportar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
