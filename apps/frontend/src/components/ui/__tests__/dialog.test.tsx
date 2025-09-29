import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../dialog';

describe('Dialog UI component', () => {
  it('exposes aria-modal by default and allows overriding', async () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog" aria-modal={false}>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descrição</DialogDescription>
          Conteúdo
        </DialogContent>
      </Dialog>
    );

    expect(await screen.findByTestId('dialog')).toHaveAttribute('aria-modal', 'false');
  });

  it('defines aria-modal when no value is provided', async () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-default">
          <DialogTitle>Título padrão</DialogTitle>
          <DialogDescription>Detalhes</DialogDescription>
          Conteúdo
        </DialogContent>
      </Dialog>
    );

    expect(await screen.findByTestId('dialog-default')).toHaveAttribute('aria-modal', 'true');
  });
});
