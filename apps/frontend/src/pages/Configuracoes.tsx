import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ConfiguracaoUsuario, PermissionSummary, UpdateUsuarioPayload } from '@/types/configuracoes';
import {
  useConfiguracoesUsuarios,
  useCreateConfiguracaoUsuario,
  useUpdateConfiguracaoUsuario,
  useResetConfiguracaoUsuarioSenha,
  useConfiguracoesUsuarioPermissoes,
  useSetConfiguracoesUsuarioPermissoes,
  useUsuariosPaginationInfo,
} from '@/hooks/useConfiguracoesUsuarios';
import {
  useConfiguracoesPermissoes,
  useConfiguracoesRoles,
  useConfiguracoesRolePermissoes,
  useCreateConfiguracaoPermissao,
  useSetConfiguracoesRolePermissoes,
  usePermissionsPaginationInfo,
} from '@/hooks/useConfiguracoesPermissoes';

const Configuracoes = () => {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="papeis">Papéis</TabsTrigger>
              <TabsTrigger value="permissoes">Permissões</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
              {/* Adicione configurações gerais aqui */}
            </TabsContent>

            <TabsContent value="usuarios">
              <UsuariosTab />
            </TabsContent>

            <TabsContent value="papeis">
              <PapeisTab />
            </TabsContent>

            <TabsContent value="permissoes">
              <PermissoesTab />
            </TabsContent>

            <TabsContent value="notificacoes">
              <h3 className="text-lg font-semibold mb-4">Configurações de Notificações</h3>
              {/* Adicione configurações de notificações aqui */}
            </TabsContent>

            <TabsContent value="sistema">
              <h3 className="text-lg font-semibold mb-4">Configurações do Sistema</h3>
              {/* Adicione configurações do sistema aqui */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;

// ---- Subcomponentes ----
function UsuariosTab() {
  const [form, setForm] = useState({ email: '', password: '', nome: '', papel: 'user' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openPermUser, setOpenPermUser] = useState<number | null>(null);

  const usuariosQuery = useConfiguracoesUsuarios({ search, page, limit });
  const usuariosPagination = useUsuariosPaginationInfo(usuariosQuery);
  const createUsuario = useCreateConfiguracaoUsuario();
  const updateUsuario = useUpdateConfiguracaoUsuario();
  const resetSenha = useResetConfiguracaoUsuarioSenha();
  const setPermissoesUsuario = useSetConfiguracoesUsuarioPermissoes();
  const permissoesCatalogoQuery = useConfiguracoesPermissoes({ limit: 500 });
  const usuarioPermissoesQuery = useConfiguracoesUsuarioPermissoes(openPermUser);

  const usuarios = usuariosQuery.data?.data ?? [];
  const totalPages = usuariosPagination.totalPages;
  const total = usuariosPagination.total;
  const permissoesCatalogo = permissoesCatalogoQuery.data?.data ?? [];

  const isCriarDisabled = !form.email || !form.password || !form.nome || createUsuario.isPending;

  const handleCreate = async () => {
    if (isCriarDisabled) return;
    const payload = {
      email: form.email,
      password: form.password,
      nome: form.nome,
      papel: form.papel?.trim() || 'user',
    };

    try {
      await createUsuario.mutateAsync(payload);
      setForm({ email: '', password: '', nome: '', papel: 'user' });
      setPage(1);
    } catch (error) {
      // Feedback tratado pelo hook via toast
    }
  };

  const handleUpdate = (usuario: ConfiguracaoUsuario, data: UpdateUsuarioPayload) => {
    updateUsuario.mutate({ id: usuario.id, data });
  };

  const handleResetPassword = (usuario: ConfiguracaoUsuario) => {
    resetSenha.mutate({ id: usuario.id, newPassword: '123456' });
  };

  const usuarioAberto = useMemo(
    () => usuarios.find((usuario) => usuario.id === openPermUser) ?? null,
    [usuarios, openPermUser],
  );

  const handleTogglePermission = (permissionName: string) => {
    if (!usuarioAberto) return;
    const atual = usuarioPermissoesQuery.data ?? [];
    const next = atual.includes(permissionName)
      ? atual.filter((perm) => perm !== permissionName)
      : [...atual, permissionName];
    setPermissoesUsuario.mutate({ userId: usuarioAberto.id, permissions: next });
  };

  const permissoesPorGrupo = useMemo(() => {
    return permissoesCatalogo.reduce<Record<string, PermissionSummary[]>>((acc, permission) => {
      const [grupo] = permission.name.split('.');
      const key = grupo || 'geral';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(permission);
      return acc;
    }, {});
  }, [permissoesCatalogo]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Input placeholder="Papel" value={form.papel ?? ''} onChange={(e) => setForm({ ...form, papel: e.target.value })} />
        <Button onClick={() => void handleCreate()} disabled={isCriarDisabled}>
          {createUsuario.isPending ? 'Criando...' : 'Criar usuário'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome/email"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <div className="flex-1" />
        <select
          className="border rounded px-2 py-1"
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(parseInt(e.target.value, 10));
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      {usuariosQuery.isError && (
        <div role="alert" className="text-sm text-destructive">
          Erro ao carregar usuários: {usuariosQuery.error.message}
        </div>
      )}

      {usuariosQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando usuários...</div>
      ) : (
        <div className="space-y-2">
          {usuarios.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          )}
          {usuarios.map((usuario) => (
            <div key={usuario.id} className="flex flex-col gap-2 border rounded p-2 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="font-medium">
                  {usuario.nome}{' '}
                  <span className="text-xs text-muted-foreground">({usuario.email})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  papel: {usuario.papel} • ativo: {String(usuario.ativo)}
                </div>
              </div>
              <Input
                className="w-full md:w-28"
                placeholder="papel"
                defaultValue={usuario.papel}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== usuario.papel) {
                    handleUpdate(usuario, { papel: value });
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => handleUpdate(usuario, { ativo: !usuario.ativo })}
                disabled={updateUsuario.isPending}
              >
                {usuario.ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="outline" onClick={() => handleResetPassword(usuario)} disabled={resetSenha.isPending}>
                {resetSenha.isPending ? 'Resetando...' : 'Reset senha'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenPermUser((prev) => (prev === usuario.id ? null : usuario.id));
                }}
              >
                Permissões
              </Button>
            </div>
          ))}
        </div>
      )}

      {openPermUser && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-semibold">Permissões do usuário {openPermUser}</div>
          {!usuarioAberto && (
            <div className="text-sm text-muted-foreground">Usuário não encontrado nesta página.</div>
          )}
          {permissoesCatalogoQuery.isError && (
            <div role="alert" className="text-sm text-destructive">
              Erro ao carregar catálogo de permissões: {permissoesCatalogoQuery.error.message}
            </div>
          )}
          {permissoesCatalogoQuery.isLoading || usuarioPermissoesQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando permissões...</div>
          ) : usuarioPermissoesQuery.isError ? (
            <div role="alert" className="text-sm text-destructive">
              Erro ao carregar permissões do usuário: {usuarioPermissoesQuery.error.message}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(permissoesPorGrupo)
                .sort()
                .map((grupo) => (
                  <div key={grupo} className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{grupo}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {permissoesPorGrupo[grupo].map((permission) => {
                        const assigned = (usuarioPermissoesQuery.data ?? []).includes(permission.name);
                        return (
                          <label key={permission.name} className="flex items-center gap-2 border rounded p-2 text-sm">
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={() => handleTogglePermission(permission.name)}
                              disabled={setPermissoesUsuario.isPending || !usuarioAberto}
                            />
                            <span className="font-medium">{permission.name}</span>
                            <span className="text-xs text-muted-foreground">{permission.description}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {Object.keys(permissoesPorGrupo).length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhuma permissão disponível.</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages} • {total} registros
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

function PapeisTab() {
  const [selected, setSelected] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const rolesQuery = useConfiguracoesRoles();
  const permissoesQuery = useConfiguracoesPermissoes({ search: permSearch, page, limit });
  const permissoesPagination = usePermissionsPaginationInfo(permissoesQuery);
  const rolePermissoesQuery = useConfiguracoesRolePermissoes(selected);
  const setRolePermissoes = useSetConfiguracoesRolePermissoes();

  useEffect(() => {
    if (rolePermissoesQuery.data) {
      setPerms(rolePermissoesQuery.data);
    } else if (!selected) {
      setPerms([]);
    }
  }, [rolePermissoesQuery.data, selected]);

  const permissoes = permissoesQuery.data?.data ?? [];
  const grupos = useMemo(() => {
    return permissoes.reduce<Record<string, PermissionSummary[]>>((acc, permission) => {
      const [grupo] = permission.name.split('.');
      const key = grupo || 'geral';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(permission);
      return acc;
    }, {});
  }, [permissoes]);

  const toggle = (name: string) => {
    setPerms((prev) => (prev.includes(name) ? prev.filter((perm) => perm !== name) : [...prev, name]));
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await setRolePermissoes.mutateAsync({ role: selected, permissions: perms });
    } catch (error) {
      // Erro tratado via toast
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input className="w-56" placeholder="papel" value={selected} onChange={(e) => setSelected(e.target.value)} />
        <Button variant="outline" onClick={() => void handleSave()} disabled={!selected || setRolePermissoes.isPending}>
          {setRolePermissoes.isPending ? 'Salvando...' : 'Salvar permissões'}
        </Button>
      </div>

      {rolesQuery.isError && (
        <div role="alert" className="text-sm text-destructive">
          Erro ao carregar papéis: {rolesQuery.error.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="buscar permissão"
          value={permSearch}
          onChange={(e) => {
            setPage(1);
            setPermSearch(e.target.value);
          }}
        />
        <div className="flex-1" />
        <select
          className="border rounded px-2 py-1"
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(parseInt(e.target.value, 10));
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {permissoesQuery.isError && (
        <div role="alert" className="text-sm text-destructive">
          Erro ao carregar permissões: {permissoesQuery.error.message}
        </div>
      )}

      {permissoesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando permissões...</div>
      ) : (
        <>
          {Object.keys(grupos).length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma permissão encontrada.</div>
          )}
          {Object.keys(grupos)
            .sort()
            .map((grupo) => (
              <div key={grupo} className="space-y-2">
                <div className="text-sm font-semibold mt-2">{grupo}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {grupos[grupo].map((permission) => (
                    <label key={permission.name} className="flex items-center gap-2 border rounded p-2">
                      <input
                        type="checkbox"
                        checked={perms.includes(permission.name)}
                        onChange={() => toggle(permission.name)}
                        disabled={setRolePermissoes.isPending}
                      />
                      <span className="font-medium">{permission.name}</span>
                      <span className="text-xs text-muted-foreground">{permission.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
        </>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {permissoesPagination.totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= permissoesPagination.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Papéis existentes: {rolesQuery.data?.join(', ') || '—'}
      </div>
    </div>
  );
}

function PermissoesTab() {
  const [form, setForm] = useState({ name: '', description: '' });
  const permissoesQuery = useConfiguracoesPermissoes({ limit: 200 });
  const createPermissao = useCreateConfiguracaoPermissao();
  const permissoes = permissoesQuery.data?.data ?? [];

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await createPermissao.mutateAsync({ name: form.name.trim(), description: form.description.trim() || undefined });
      setForm({ name: '', description: '' });
    } catch (error) {
      // Feedback exibido via toast
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input placeholder="nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          placeholder="descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button onClick={() => void handleCreate()} disabled={createPermissao.isPending || !form.name.trim()}>
          {createPermissao.isPending ? 'Criando...' : 'Criar permissão'}
        </Button>
      </div>

      {permissoesQuery.isError && (
        <div role="alert" className="text-sm text-destructive">
          Erro ao carregar permissões: {permissoesQuery.error.message}
        </div>
      )}

      {permissoesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando permissões...</div>
      ) : (
        <div className="space-y-2">
          {permissoes.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</div>
          )}
          {permissoes.map((permissao) => (
            <div key={permissao.name} className="flex items-center justify-between border rounded p-2">
              <div>
                <div className="font-medium">{permissao.name}</div>
                <div className="text-xs text-muted-foreground">{permissao.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
