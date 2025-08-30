import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import apiService from '@/services/apiService';

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
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ email: '', password: '', nome: '', papel: 'user' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [openPermUser, setOpenPermUser] = useState<number | null>(null);
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [userPerms, setUserPerms] = useState<Record<number, string[]>>({});
  const load = async () => {
    const r = await apiService.listUsers({ search, page, limit });
    if (r.success && r.data) {
      setUsers(r.data.data || []);
      setTotal(r.data.pagination?.total || 0);
    }
  };
  useEffect(() => { load(); }, [search, page, limit]);
  useEffect(() => { (async()=>{ const p = await apiService.listPermissions(); if (p.success && p.data) setAllPerms(p.data as any); })(); }, []);
  const create = async () => {
    if (!form.email || !form.password || !form.nome) return;
    await apiService.createUser(form as any);
    setForm({ email: '', password: '', nome: '', papel: 'user' });
    setPage(1); await load();
  };
  const update = async (u: any, patch: any) => { await apiService.updateUser(u.id, patch); await load(); };
  const togglePerm = async (u: any, perm: string) => {
    const current = userPerms[u.id] || (await apiService.getUserPermissions(u.id)).data || [];
    const next = current.includes(perm) ? current.filter((p:string)=>p!==perm) : [...current, perm];
    await apiService.setUserPermissions(u.id, next);
    setUserPerms(prev => ({ ...prev, [u.id]: next }));
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} />
        <Input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
        <Input placeholder="Senha" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
        <Input placeholder="Papel" value={form.papel} onChange={e=>setForm({...form, papel: e.target.value})} />
        <Button onClick={create}>Criar usuário</Button>
      </div>
      <div className="flex items-center gap-2">
        <Input placeholder="Buscar por nome/email" value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} />
        <div className="flex-1" />
        <select className="border rounded px-2 py-1" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)); }}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-2 border rounded p-2">
            <div className="flex-1">
              <div className="font-medium">{u.nome} <span className="text-xs text-muted-foreground">({u.email})</span></div>
              <div className="text-xs text-muted-foreground">papel: {u.papel} • ativo: {String(u.ativo)}</div>
            </div>
            <Input className="w-28" placeholder="papel" defaultValue={u.papel} onBlur={e=>update(u,{ papel: e.target.value })} />
            <Button variant="outline" onClick={()=>update(u,{ ativo: !u.ativo })}>{u.ativo? 'Desativar':'Ativar'}</Button>
            <Button variant="outline" onClick={()=>apiService.resetUserPassword(u.id,'123456')}>Reset senha</Button>
            <Button variant="outline" onClick={async()=>{ if (openPermUser===u.id) { setOpenPermUser(null); } else { const gp = await apiService.getUserPermissions(u.id); setUserPerms(prev=>({ ...prev, [u.id]: gp.data || [] })); setOpenPermUser(u.id); } }}>Permissões</Button>
          </div>
        ))}
        {openPermUser && (
          <div className="border rounded p-3">
            <div className="text-sm font-semibold mb-2">Permissões do usuário {openPermUser}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {allPerms.map((p:any)=>(
                <label key={p.name} className="flex items-center gap-2 border rounded p-2">
                  <input type="checkbox" checked={(userPerms[openPermUser]||[]).includes(p.name)} onChange={()=>togglePerm({ id: openPermUser }, p.name)} />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {page} de {Math.max(1, Math.ceil(total/limit))}</span>
        <Button variant="outline" disabled={page>=Math.ceil(total/limit)} onClick={()=>setPage(p=>p+1)}>Próxima</Button>
      </div>
    </div>
  );
}

function PapeisTab() {
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [all, setAll] = useState<any[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const load = async () => {
    const r = await apiService.listRoles(); if (r.success && r.data) setRoles(r.data as any);
    const p = await apiService.listPermissions({ search: permSearch, page, limit }); if (p.success && p.data) { setAll(p.data.data as any); setTotal(p.data.pagination?.total || 0); }
    if (selected) { const rp = await apiService.getRolePermissions(selected); if (rp.success && rp.data) setPerms(rp.data as any); }
  };
  useEffect(() => { load(); }, [selected, permSearch, page, limit]);
  const toggle = (name: string) => {
    setPerms(prev => prev.includes(name) ? prev.filter(x=>x!==name) : [...prev, name]);
  };
  const save = async () => { if (!selected) return; await apiService.setRolePermissions(selected, perms); };
  const groups = (all || []).reduce((acc:any, p:any)=>{
    const key = String(p.name).split('.')[0] || 'geral';
    (acc[key] ||= []).push(p);
    return acc;
  }, {} as Record<string, any[]>);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input className="w-56" placeholder="papel" value={selected} onChange={e=>setSelected(e.target.value)} />
        <Button variant="outline" onClick={save} disabled={!selected}>Salvar permissões</Button>
      </div>
      <div className="flex items-center gap-2">
        <Input placeholder="buscar permissão" value={permSearch} onChange={e=>{ setPage(1); setPermSearch(e.target.value); }} />
        <div className="flex-1" />
        <select className="border rounded px-2 py-1" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)); }}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      {Object.keys(groups).sort().map(groupKey => (
        <div key={groupKey} className="space-y-2">
          <div className="text-sm font-semibold mt-2">{groupKey}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {groups[groupKey].map((p:any)=>(
              <label key={p.name} className="flex items-center gap-2 border rounded p-2">
                <input type="checkbox" checked={perms.includes(p.name)} onChange={()=>toggle(p.name)} />
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {page} de {Math.max(1, Math.ceil(total/limit))}</span>
        <Button variant="outline" disabled={page>=Math.ceil(total/limit)} onClick={()=>setPage(p=>p+1)}>Próxima</Button>
      </div>
      <div className="text-sm text-muted-foreground">Papéis existentes: {roles.join(', ') || '—'}</div>
    </div>
  );
}

function PermissoesTab() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const load = async () => { const r = await apiService.listPermissions(); if (r.success && r.data) setList(r.data as any); };
  useEffect(() => { load(); }, []);
  const create = async () => { if (!form.name) return; await apiService.createPermission(form.name, form.description); setForm({ name:'', description:'' }); await load(); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input placeholder="nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <Input placeholder="descrição" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <Button onClick={create}>Criar permissão</Button>
      </div>
      <div className="space-y-2">
        {list.map((p:any)=>(
          <div key={p.name} className="flex items-center justify-between border rounded p-2">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
