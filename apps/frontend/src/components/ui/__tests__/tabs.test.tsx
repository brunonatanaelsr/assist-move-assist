import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs UI component', () => {
  it('forwards aria attributes to the underlying Radix primitives', () => {
    render(
      <Tabs defaultValue="tab-1">
        <TabsList aria-label="Seletor de abas">
          <TabsTrigger id="tab-1" value="tab-1" aria-controls="pane-1">
            Aba 1
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab-1" id="pane-1" aria-labelledby="tab-1">
          Conteúdo
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Seletor de abas');
    expect(screen.getByRole('tab', { name: 'Aba 1' })).toHaveAttribute('aria-controls', 'pane-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-1');
  });
});
