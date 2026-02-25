import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Trash2, CheckCircle, MessageCircle, Calendar, Clock, User, Filter, LogOut, Settings, Plus, LayoutDashboard, Edit, X } from 'lucide-react'

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  
  const [abaAtiva, setAbaAtiva] = useState('agenda')
  const [agendamentos, setAgendamentos] = useState([])
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true)
  
  // ESTADO DOS PSICÓLOGOS DO BANCO
  const [listaPsicologos, setListaPsicologos] = useState([])
  const [filtroPsi, setFiltroPsi] = useState('Todos') // Agora guarda o ID
  const [isPsiFixo, setIsPsiFixo] = useState(false)

  const [modalAgendaAberto, setModalAgendaAberto] = useState(false)
  const [editingAgendamentoId, setEditingAgendamentoId] = useState(null)
  const [formManual, setFormManual] = useState({ nome_paciente: '', telefone_paciente: '', psicologo_id: '', data_agendamento: '', horario: '', status: 'pendente' })

  const [configuracoes, setConfiguracoes] = useState([])
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [editingConfigId, setEditingConfigId] = useState(null)
  const [formConfig, setFormConfig] = useState({ psicologo_id: '', dia_semana: '1', hora_inicio: '18:00', hora_fim: '21:00' })

  const nomesDias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  // --- BUSCA INICIAL DE USUÁRIO E PSICÓLOGOS ---
  useEffect(() => {
    const carregarSistema = async () => {
      // Puxa lista de psicólogos do banco
      const { data: psis } = await supabase.from('psicologos').select('*')
      if (psis) setListaPsicologos(psis)

      // Checa sessão atual
      const { data: { session } } = await supabase.auth.getSession()
      if (session && psis) configurarUsuario(session.user, psis)
    }
    carregarSistema()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: psis } = await supabase.from('psicologos').select('*')
        configurarUsuario(session.user, psis || listaPsicologos)
      } else {
        setAutenticado(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const configurarUsuario = (user, psis) => {
    setUsuarioAtual(user)
    setAutenticado(true)
    
    // Descobre se quem logou é um dos psicólogos
    const psiVinculado = psis.find(p => p.email === user.email)
    
    if (psiVinculado) {
      setFiltroPsi(psiVinculado.id)
      setIsPsiFixo(true)
    } else {
      setFiltroPsi('Todos') // Admin Geral (ex: contato@savoir.com)
      setIsPsiFixo(false)
    }

    buscarAgendamentos()
    buscarConfiguracoes()
  }

  // --- LOGIN REAL ---
  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) alert('Erro ao entrar. E-mail ou senha inválidos.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setEmail('')
    setSenha('')
  }

  // --- BUSCAR DADOS ---
  const buscarAgendamentos = async () => {
    setLoadingAgendamentos(true)
    const { data, error } = await supabase.from('agendamentos').select('*').order('data_agendamento', { ascending: true })
    if (!error) setAgendamentos(data)
    setLoadingAgendamentos(false)
  }

  const buscarConfiguracoes = async () => {
    setLoadingConfigs(true)
    const { data, error } = await supabase.from('config_agenda').select('*').order('dia_semana', { ascending: true })
    if (!error) setConfiguracoes(data)
    setLoadingConfigs(false)
  }

  // --- AÇÕES DE AGENDAMENTO (AGORA RELACIONAL) ---
  const handleConfirmar = async (id) => {
    await supabase.from('agendamentos').update({ status: 'confirmado' }).eq('id', id)
    buscarAgendamentos()
  }

  const handleDeletarAgendamento = async (id) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await supabase.from('agendamentos').delete().eq('id', id)
      buscarAgendamentos()
    }
  }

  const abrirModalNovoAgendamento = () => {
    setEditingAgendamentoId(null)
    setFormManual({ 
      nome_paciente: '', telefone_paciente: '', 
      psicologo_id: isPsiFixo ? filtroPsi : '', 
      data_agendamento: '', horario: '', status: 'confirmado' 
    })
    setModalAgendaAberto(true)
  }

  const abrirModalEditarAgendamento = (item) => {
    setEditingAgendamentoId(item.id)
    setFormManual({ ...item })
    setModalAgendaAberto(true)
  }

  const handleSalvarAgendamentoManual = async (e) => {
    e.preventDefault()
    
    // Adicionamos o nome por segurança caso queira exibir sem fazer join no banco
    const psiSelecionado = listaPsicologos.find(p => p.id === formManual.psicologo_id)
    const dadosEnvio = { ...formManual, psicologa: psiSelecionado?.nome }

    if (editingAgendamentoId) {
      const {error} = await supabase.from('agendamentos').update(dadosEnvio).eq('id', editingAgendamentoId)
      if(error) alert(error.message)
    } else {
      const {error} = await supabase.from('agendamentos').insert([dadosEnvio])
      if(error) alert(error.message)
    }
    setModalAgendaAberto(false)
    buscarAgendamentos()
  }

  // --- AÇÕES DE CONFIGURAÇÃO (HORÁRIOS) ---
  const handleSalvarConfig = async (e) => {
    e.preventDefault()
    const idSelecionado = isPsiFixo ? filtroPsi : formConfig.psicologo_id
    if (!idSelecionado) return alert('Escolha um profissional!')

    const { data: turnosExistentes } = await supabase.from('config_agenda').select('id')
      .eq('psicologo_id', idSelecionado).eq('dia_semana', parseInt(formConfig.dia_semana))

    if (turnosExistentes.length > 0 && (!editingConfigId || turnosExistentes[0].id !== editingConfigId)) {
      return alert('Já existe um turno neste dia da semana para este profissional!')
    }

    const psiDb = listaPsicologos.find(p => p.id === idSelecionado)
    const dadosTurno = {
      psicologo_id: idSelecionado,
      psicologa: psiDb.nome, // Mantém backup de nome
      dia_semana: parseInt(formConfig.dia_semana), 
      hora_inicio: formConfig.hora_inicio, 
      hora_fim: formConfig.hora_fim, 
      duracao_minutos: 50
    }

    if (editingConfigId) {
      await supabase.from('config_agenda').update(dadosTurno).eq('id', editingConfigId)
    } else {
      await supabase.from('config_agenda').insert([dadosTurno])
    }

    setEditingConfigId(null)
    setFormConfig({ psicologo_id: '', dia_semana: '1', hora_inicio: '18:00', hora_fim: '21:00' })
    buscarConfiguracoes()
  }

  const iniciarEdicaoConfig = (item) => {
    setEditingConfigId(item.id)
    setFormConfig({ psicologo_id: item.psicologo_id, dia_semana: item.dia_semana.toString(), hora_inicio: item.hora_inicio, hora_fim: item.hora_fim })
  }

  const cancelarEdicaoConfig = () => {
    setEditingConfigId(null)
    setFormConfig({ psicologo_id: '', dia_semana: '1', hora_inicio: '18:00', hora_fim: '21:00' })
  }

  const handleDeletarConfig = async (id) => {
    if (confirm('Deseja excluir este turno?')) {
      await supabase.from('config_agenda').delete().eq('id', id)
      buscarConfiguracoes()
    }
  }

  // --- FILTROS APLICADOS NA TELA ---
  const listaAgendamentosFiltrada = filtroPsi === 'Todos' ? agendamentos : agendamentos.filter(item => item.psicologo_id === filtroPsi)
  const listaConfigsFiltrada = filtroPsi === 'Todos' ? configuracoes : configuracoes.filter(item => item.psicologo_id === filtroPsi)

  // AJUDANTE PARA NOME
  const getNomePsi = (id) => listaPsicologos.find(p => p.id === id)?.nome || 'Profissional'

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-savoir-navy text-white px-4">
        <form onSubmit={handleLogin} className="bg-white/10 p-8 rounded-2xl backdrop-blur-md w-full max-w-sm border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-serif text-center mb-2 text-savoir-gold">Savoir Admin</h1>
          <p className="text-center text-sm text-gray-300 mb-8">Acesso restrito para profissionais</p>
          <input type="email" placeholder="Seu E-mail" required className="w-full p-3 rounded bg-white/90 text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-savoir-gold" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Sua Senha" required className="w-full p-3 rounded bg-white/90 text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-savoir-gold" value={senha} onChange={e => setSenha(e.target.value)} />
          <button className="w-full bg-savoir-gold text-white font-bold py-3 rounded hover:bg-[#b09268] transition shadow-lg">Entrar no Sistema</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col md:flex-row relative">
      <aside className="w-full md:w-64 bg-savoir-navy text-white flex flex-col shadow-xl z-20 md:sticky md:top-0 md:h-screen">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-serif italic text-savoir-gold mb-1">Savoir Admin</h1>
          <p className="text-xs text-gray-400 break-all">{usuarioAtual?.email}</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button onClick={() => setAbaAtiva('agenda')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${abaAtiva === 'agenda' ? 'bg-savoir-gold text-white' : 'hover:bg-white/10 text-gray-300'}`}><LayoutDashboard size={20} /> Pacientes</button>
          <button onClick={() => setAbaAtiva('config')} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${abaAtiva === 'config' ? 'bg-savoir-gold text-white' : 'hover:bg-white/10 text-gray-300'}`}><Settings size={20} /> Meus Horários</button>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={handleLogout} className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-500/20 text-red-300 transition-colors"><LogOut size={20}/> Sair do Sistema</button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-savoir-navy font-serif">{abaAtiva === 'agenda' ? 'Gestão de Agendamentos' : 'Configuração de Agenda'}</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {abaAtiva === 'agenda' && (
              <button onClick={abrirModalNovoAgendamento} className="bg-savoir-navy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-savoir-gold transition flex items-center gap-2 w-full md:w-auto justify-center"><Plus size={16}/> Novo Agendamento</button>
            )}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter size={18} className="text-gray-400"/>
              {/* SELECT DINÂMICO DOS PSICÓLOGOS */}
              <select className="bg-gray-50 border border-gray-200 text-sm p-2 rounded-lg outline-none focus:border-savoir-gold w-full md:w-auto disabled:opacity-50" value={filtroPsi} onChange={e => setFiltroPsi(e.target.value)} disabled={isPsiFixo}>
                <option value="Todos">Visão Geral (Todos)</option>
                {listaPsicologos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {abaAtiva === 'agenda' && (
          <div>
            {loadingAgendamentos ? <p className="text-center py-20 text-gray-500">Carregando pacientes...</p> : listaAgendamentosFiltrada.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300"><p className="text-gray-400">Nenhum agendamento encontrado.</p></div> : (
              <div className="grid gap-4">
                {listaAgendamentosFiltrada.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status || 'Pendente'}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12}/> {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-lg font-bold text-savoir-navy flex items-center gap-2">{item.nome_paciente}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
                        <p className="flex items-center gap-1"><User size={14} className="text-savoir-gold"/> {getNomePsi(item.psicologo_id)}</p>
                        <p className="flex items-center gap-1"><Calendar size={14} className="text-savoir-gold"/> {new Date(item.data_agendamento + 'T00:00:00').toLocaleDateString()}</p>
                        <p className="flex items-center gap-1"><Clock size={14} className="text-savoir-gold"/> {item.horario}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 md:mt-0 w-full md:w-auto">
                      <a href={`https://wa.me/55${item.telefone_paciente.replace(/\D/g,'')}?text=Olá ${item.nome_paciente}, sou da clínica Savoir Psi.`} target="_blank" className="flex-1 md:flex-none bg-green-50 text-green-600 p-2 rounded hover:bg-green-100 transition flex items-center justify-center border border-green-200"><MessageCircle size={18} /></a>
                      {item.status !== 'confirmado' && <button onClick={() => handleConfirmar(item.id)} className="flex-1 md:flex-none bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 transition flex items-center justify-center border border-blue-200"><CheckCircle size={18} /></button>}
                      <button onClick={() => abrirModalEditarAgendamento(item)} className="flex-1 md:flex-none bg-orange-50 text-orange-600 p-2 rounded hover:bg-orange-100 transition flex items-center justify-center border border-orange-200"><Edit size={18} /></button>
                      <button onClick={() => handleDeletarAgendamento(item.id)} className="flex-1 md:flex-none bg-red-50 text-red-500 p-2 rounded hover:bg-red-100 transition flex items-center justify-center border border-red-200"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'config' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className={`md:col-span-1 p-6 rounded-xl shadow-sm border self-start transition-all ${editingConfigId ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-savoir-navy flex items-center gap-2">{editingConfigId ? <><Edit size={18} className="text-orange-500"/> Editar Turno</> : <><Plus size={18} className="text-savoir-gold"/> Cadastrar Turno</>}</h3>
                {editingConfigId && <button onClick={cancelarEdicaoConfig} className="text-xs text-red-500 font-bold hover:underline">Cancelar</button>}
              </div>

              <form onSubmit={handleSalvarConfig} className="flex flex-col gap-4 text-sm">
                {!isPsiFixo && (
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Profissional:</label>
                    <select required className="w-full border p-2 rounded bg-white outline-none focus:border-savoir-gold disabled:opacity-50" disabled={editingConfigId !== null} value={formConfig.psicologo_id} onChange={e => setFormConfig({...formConfig, psicologo_id: e.target.value})}>
                      <option value="">Selecione...</option>
                      {listaPsicologos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Dia da Semana:</label>
                  <select required className="w-full border p-2 rounded bg-white outline-none focus:border-savoir-gold" value={formConfig.dia_semana} onChange={e => setFormConfig({...formConfig, dia_semana: e.target.value})}>
                    <option value="1">Segunda-feira</option><option value="2">Terça-feira</option><option value="3">Quarta-feira</option><option value="4">Quinta-feira</option><option value="5">Sexta-feira</option><option value="6">Sábado</option><option value="0">Domingo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-gray-600 font-bold mb-1">Das:</label><input required type="time" className="w-full border p-2 rounded bg-white outline-none focus:border-savoir-gold" value={formConfig.hora_inicio} onChange={e => setFormConfig({...formConfig, hora_inicio: e.target.value})} /></div>
                  <div><label className="block text-gray-600 font-bold mb-1">Até às:</label><input required type="time" className="w-full border p-2 rounded bg-white outline-none focus:border-savoir-gold" value={formConfig.hora_fim} onChange={e => setFormConfig({...formConfig, hora_fim: e.target.value})} /></div>
                </div>
                <button type="submit" className={`w-full text-white font-bold py-3 rounded transition ${editingConfigId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-savoir-navy hover:bg-savoir-gold'}`}>{editingConfigId ? 'Atualizar Turno' : 'Salvar Turno'}</button>
              </form>
            </div>

            <div className="md:col-span-2">
              <h3 className="font-bold text-savoir-navy mb-4 flex items-center gap-2"><Clock size={18} className="text-savoir-gold"/> Turnos Ativos</h3>
              {loadingConfigs ? <p className="text-gray-500 p-6 bg-white rounded-xl shadow-sm text-center">Carregando horários...</p> : listaConfigsFiltrada.length === 0 ? <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-dashed border-gray-300"><p className="text-gray-400">Nenhum turno cadastrado.</p></div> : (
                <div className="grid gap-3">
                  {listaConfigsFiltrada.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                      <div>
                        <p className="font-bold text-savoir-navy">{getNomePsi(item.psicologo_id)}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span className="bg-savoir-light px-2 py-1 rounded text-savoir-gold font-bold">{nomesDias[item.dia_semana]}</span>
                          <span className="flex items-center gap-1"><Clock size={14}/> {item.hora_inicio} às {item.hora_fim}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => iniciarEdicaoConfig(item)} className="text-orange-400 hover:text-orange-600 p-2 bg-orange-50 hover:bg-orange-100 rounded transition"><Edit size={18} /></button>
                        <button onClick={() => handleDeletarConfig(item.id)} className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded transition"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL MANUAL COM SELECT DINÂMICO DE ID */}
      {modalAgendaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-savoir-navy/80 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setModalAgendaAberto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><X size={24}/></button>
            <h2 className="text-2xl font-serif text-savoir-navy mb-6">{editingAgendamentoId ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
            <form onSubmit={handleSalvarAgendamentoManual} className="flex flex-col gap-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Paciente</label><input required type="text" className="w-full border-b border-gray-300 p-2 outline-none focus:border-savoir-gold bg-transparent" value={formManual.nome_paciente} onChange={e => setFormManual({...formManual, nome_paciente: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label><input required type="text" className="w-full border-b border-gray-300 p-2 outline-none focus:border-savoir-gold bg-transparent" value={formManual.telefone_paciente} onChange={e => setFormManual({...formManual, telefone_paciente: e.target.value})} /></div>
              {!isPsiFixo && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Profissional</label>
                  <select required className="w-full border-b border-gray-300 p-2 outline-none focus:border-savoir-gold bg-transparent" value={formManual.psicologo_id} onChange={e => setFormManual({...formManual, psicologo_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {listaPsicologos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Data</label><input required type="date" className="w-full border-b border-gray-300 p-2 outline-none focus:border-savoir-gold bg-transparent" value={formManual.data_agendamento} onChange={e => setFormManual({...formManual, data_agendamento: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Horário</label><input required type="time" className="w-full border-b border-gray-300 p-2 outline-none focus:border-savoir-gold bg-transparent" value={formManual.horario} onChange={e => setFormManual({...formManual, horario: e.target.value})} /></div>
              </div>
              <button type="submit" className="mt-4 bg-savoir-gold text-white font-bold py-3 rounded-lg hover:bg-[#b09268] transition">{editingAgendamentoId ? 'Salvar Alterações' : 'Confirmar Agendamento'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}