import { useState, useEffect } from 'react'
import { Menu, X, MessageCircle, Brain, Heart, Users, GraduationCap, BookOpen, ChevronRight, MapPin, Calendar, CheckCircle, Clock } from 'lucide-react'
import { supabase } from './supabase'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedPsi, setSelectedPsi] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  
  // --- ESTADOS DO FORMULÁRIO E AGENDA DINÂMICA ---
  const [formAgenda, setFormAgenda] = useState({ nome: '', telefone: '', data: '', horario: '' })
  const [statusAgenda, setStatusAgenda] = useState('idle') // idle, loading, success
  
  // Novos estados para a Mágica dos Horários
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([])
  const [statusHorarios, setStatusHorarios] = useState('idle') // idle, loading, done, erro

  // Trava de data (Sempre a partir de amanhã)
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataMinima = amanha.toISOString().split('T')[0];

  // =========================================================================
  // A MÁQUINA MATEMÁTICA DE HORÁRIOS
  // =========================================================================
  useEffect(() => {
    const calcularHorariosDisponiveis = async () => {
      if (!formAgenda.data || !selectedPsi) return;
      
      setStatusHorarios('loading')
      setFormAgenda(prev => ({ ...prev, horario: '' })) // Limpa o horário se mudar o dia

      try {
        // 1. Descobrir qual é o dia da semana (Ajuste de fuso T12 para evitar bugs de data)
        const dataObj = new Date(formAgenda.data + 'T12:00:00')
        const diaSemana = dataObj.getDay()

        // 2. Buscar no Supabase se o psicólogo trabalha nesse dia da semana
        const { data: configTurno, error: erroConfig } = await supabase
          .from('config_agenda')
          .select('*')
          .eq('psicologa', selectedPsi.nome)
          .eq('dia_semana', diaSemana)
          .single() // Pega apenas 1 turno

        // Se não tiver turno cadastrado ou der erro (não achou)
        if (erroConfig || !configTurno) {
          setHorariosDisponiveis([])
          setStatusHorarios('done')
          return
        }

        // 3. Gerar os blocos de 50 minutos
        const slotsGerados = []
        let [horaInicio, minInicio] = configTurno.hora_inicio.split(':').map(Number)
        let [horaFim, minFim] = configTurno.hora_fim.split(':').map(Number)
        
        let tempoAtualEmMinutos = (horaInicio * 60) + minInicio
        const tempoFimEmMinutos = (horaFim * 60) + minFim
        const duracaoSessao = configTurno.duracao_minutos || 50

        while (tempoAtualEmMinutos + duracaoSessao <= tempoFimEmMinutos) {
          // Converte os minutos de volta para formato "HH:MM"
          const h = Math.floor(tempoAtualEmMinutos / 60).toString().padStart(2, '0')
          const m = (tempoAtualEmMinutos % 60).toString().padStart(2, '0')
          slotsGerados.push(`${h}:${m}`)
          
          tempoAtualEmMinutos += duracaoSessao // Pula 50 min pra frente
        }

        // 4. Buscar agendamentos que já existem neste dia para remover da lista
        const { data: agendados } = await supabase
          .from('agendamentos')
          .select('horario')
          .eq('psicologa', selectedPsi.nome)
          .eq('data_agendamento', formAgenda.data)

        const horariosOcupados = agendados ? agendados.map(a => a.horario) : []

        // 5. Filtrar cruzando os gerados x ocupados
        const slotsLivres = slotsGerados.filter(slot => !horariosOcupados.includes(slot))

        setHorariosDisponiveis(slotsLivres)
        setStatusHorarios('done')

      } catch (error) {
        console.error("Erro ao calcular horários:", error)
        setStatusHorarios('erro')
      }
    }

    // Chama a função toda vez que a DATA selecionada mudar
    calcularHorariosDisponiveis()
  }, [formAgenda.data, selectedPsi])

  // =========================================================================

  const handleCloseModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setSelectedPsi(null)
      setIsClosing(false)
      setStatusAgenda('idle')
      setFormAgenda({ nome: '', telefone: '', data: '', horario: '' })
      setHorariosDisponiveis([])
    }, 300)
  }

  useEffect(() => {
    if (selectedPsi) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedPsi])

  const handleAgendar = async (e) => {
    e.preventDefault()
    if (!formAgenda.horario) return alert('Por favor, selecione um horário!')
    setStatusAgenda('loading')

    const { error } = await supabase.from('agendamentos').insert([{
      nome_paciente: formAgenda.nome,
      telefone_paciente: formAgenda.telefone,
      psicologa: selectedPsi.nome,
      data_agendamento: formAgenda.data,
      horario: formAgenda.horario
    }])

    if (error) {
      alert('Erro ao agendar: ' + error.message)
      setStatusAgenda('idle')
    } else {
      setStatusAgenda('success')
      setTimeout(() => {
        handleCloseModal()
      }, 3000)
    }
  }

  // --- DADOS DA EQUIPE ---
  const equipe = [
    {
      nome: "Psi. Lucas Barba", crp: "06/145904", especialidade: "Sexologia & Saúde Pública", foto: "/lucas.jpeg", link: "https://wa.me/5511999999999",
      sobre: "Formado em psicologia em 2017. Atendo Adolescentes, Adultos e Terceira Idade. Possui ampla formação em gestão de saúde e especialização em sexualidade humana.",
      formacao: ["Pós-graduação em Sexologia - Instituto Paulista de Sexualidade (2020)", "Pós-graduação em Saúde Mental - Faculdade Unyleya (2022)", "Pós-graduação em Gestão em Saúde Pública - Estácio (2021)", "Capacitação em Distúrbios Alimentares Pediátricos - Santa Marcelina (2024)", "Terapia das Sexualidades (disfunções femininas e masculinas)"],
      abordagem: "Atuação focada na saúde integral. Ofereço acolhimento para questões de sexualidade (Livre de tabus), distúrbios alimentares e saúde mental geral."
    },
    {
      nome: "Psi. Amanda Pierot", crp: "06/122476", especialidade: "Psicanálise Lacaniana & Psicossomática", foto: "/amanda.jpeg", link: "https://wa.me/5511999999999",
      sobre: "Psicanalista Lacaniana formada em 2014. Atendo público adulto e pessoas da terceira idade. Possui sólida formação clínica e hospitalar, com foco no sujeito do inconsciente.",
      formacao: ["Formação em Psicanálise Lacaniana - Fac. de Psicanálise de Strasburgo (FR)", "Formação em Psicanálise pelo Centro de Estudos Psicanalítico (CEP)", "Formação em Psicossomática Psicanalítica - Inst. Sedes Sapientia", "Formação em Cardiologia e Cardiopatia - InCor (HCFMUSP)", "Especialista em Terapia do Luto (PUC-SP) e Psicologia Geriátrica (PUC-RS)"],
      abordagem: "Orientação Lacaniana. O foco não é apenas eliminar o sintoma, mas escutar a história de vida e os desejos inconscientes, tratando questões como luto e doenças psicossomáticas."
    },
    {
      nome: "Psi. Alini Correia", crp: "06/153091", especialidade: "TCC, Neuropsicologia & Sexologia", foto: "/alini.jpeg", link: "https://wa.me/5511999999999",
      sobre: "Com 7 anos de experiência clínica, educacional e social. Minha trajetória é marcada por um olhar amplo e humanizado. Atendo crianças, adolescentes, adultos e casais.",
      formacao: ["Especialista em Sexologia Aplicada - Inst. Paulista de Sexualidade", "Formação em Neuropsicologia - FMU", "Graduação em Psicologia - Faculdade Anhanguera", "Experiência em Terapia de Casais e Saúde Sexual"],
      abordagem: "Terapia Cognitivo-Comportamental (TCC). Utilizo ferramentas práticas para transformar padrões de pensamento e comportamento. Trabalho também com identidade de gênero e fortalecimento de vínculos afetivos."
    },
    {
      nome: "Psi. Karina Catapano", crp: "06/223358", especialidade: "Psicanálise & Psicologia Organizacional", foto: "/karina.jpg", link: "https://wa.me/5511999999999",
      sobre: "Tenho 26 anos e sou apaixonada pelo ser humano. Minha atuação é híbrida e integrativa: sou Psicóloga Organizacional e Clínica. Acredito que não existe separação entre a 'pessoa' e o 'profissional'.",
      formacao: ["Graduação em Psicologia - Universidade São Judas Tadeu (2022)", "Psicóloga Organizacional e Clínica", "Ênfase em Psicanálise"],
      abordagem: "Psicanálise Integrativa. Utilizo a escuta terapêutica para tratar angústias e processos de autoconhecimento. No âmbito organizacional, aplico essa sensibilidade para humanizar relações de trabalho."
    }
  ]

  return (
    <div className="min-h-screen flex flex-col relative bg-savoir-light font-sans text-savoir-text">
      
      {/* NAVBAR */}
      <nav className="bg-savoir-navy/90 backdrop-blur-md text-white py-4 px-6 fixed w-full z-40 shadow-lg transition-all duration-300">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-serif italic tracking-widest text-savoir-gold cursor-pointer hover:scale-105 transition-transform">Savoir Psi</div>
          <div className="hidden md:flex gap-8 text-sm uppercase tracking-wide">
            <a href="#home" className="hover:text-savoir-gold transition relative group">Início <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-savoir-gold transition-all group-hover:w-full"></span></a>
            <a href="#sobre" className="hover:text-savoir-gold transition relative group">A Clínica <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-savoir-gold transition-all group-hover:w-full"></span></a>
            <a href="#equipe" className="hover:text-savoir-gold transition relative group">Profissionais <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-savoir-gold transition-all group-hover:w-full"></span></a>
            <a href="#localizacao" className="hover:text-savoir-gold transition relative group">Localização <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-savoir-gold transition-all group-hover:w-full"></span></a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-savoir-gold active:scale-90 transition">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-savoir-navy border-t border-gray-700 flex flex-col p-4 gap-4 text-center shadow-xl animate-fade-in">
            <a href="#home" onClick={() => setMenuOpen(false)}>Início</a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>A Clínica</a>
            <a href="#equipe" onClick={() => setMenuOpen(false)}>Profissionais</a>
            <a href="#localizacao" onClick={() => setMenuOpen(false)}>Localização</a>
          </div>
        )}
      </nav>

      {/* HERO E OUTRAS SEÇÕES IGUAIS... */}
      <section id="home" className="relative h-screen flex items-center justify-center bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')"}}>
        <div className="absolute inset-0 bg-savoir-navy/70"></div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl animate-fade-in-up">
          <p className="text-savoir-gold uppercase tracking-[0.2em] text-sm mb-4 font-bold">Psicologia Clínica Integrada</p>
          <h1 className="text-5xl md:text-7xl mb-6 leading-tight font-serif">Escuta, elaboração <br/> <span className="italic text-savoir-gold">e transformação.</span></h1>
          <button onClick={() => document.getElementById('equipe').scrollIntoView({ behavior: 'smooth' })} className="btn-gold inline-block mt-8 cursor-pointer active:scale-95 transform transition duration-150">Conheça Nossa Equipe</button>
        </div>
      </section>

      <section id="sobre" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl text-savoir-navy mb-6 font-serif">O Conceito Savoir</h2>
            <div className="w-20 h-1 bg-savoir-gold mb-6"></div>
            <p className="text-gray-600 leading-relaxed mb-4">"Savoir", do francês, significa <strong>Saber</strong>. Somos uma equipe multidisciplinar unida pelo propósito de oferecer um espaço de escuta qualificada e transformação.</p>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[{ icon: Brain, label: "Autonomia" }, { icon: Heart, label: "Acolhimento" }, { icon: Users, label: "Vínculo" }].map((item, i) => (
                <div key={i} className="text-center p-4 bg-savoir-light rounded-lg hover:shadow-md hover:-translate-y-1 transition duration-300 cursor-default">
                  <item.icon className="mx-auto text-savoir-navy mb-2" /><span className="text-xs font-bold uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div><img src="https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80" className="rounded-lg shadow-xl hover:shadow-2xl transition duration-500" /></div>
        </div>
      </section>

      <section id="equipe" className="py-20 px-6 bg-savoir-light">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl text-savoir-navy mb-12 font-serif">Nossos Especialistas</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto">
            {equipe.map((psi, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-lg hover:-translate-y-2 transition duration-300 group flex flex-col h-full border border-gray-100">
                <div className="h-64 overflow-hidden relative">
                   <div className="absolute inset-0 bg-savoir-navy/0 group-hover:bg-savoir-navy/20 transition duration-500 z-10"></div>
                   <img src={psi.foto} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500" />
                </div>
                <div className="p-6 text-left relative flex-1 flex flex-col">
                  <h3 className="text-lg text-savoir-navy mb-1 font-serif font-bold leading-tight">{psi.nome}</h3>
                  <p className="text-savoir-gold font-bold text-[10px] uppercase mb-4 tracking-wide min-h-[30px] flex items-center">{psi.especialidade}</p>
                  <p className="text-gray-500 text-xs mb-6 line-clamp-4 flex-1 leading-relaxed">{psi.sobre}</p>
                  <button onClick={() => setSelectedPsi(psi)} className="w-full mt-auto border border-savoir-navy text-savoir-navy py-2 rounded text-sm hover:bg-savoir-navy hover:text-white transition flex items-center justify-center gap-2 font-bold active:scale-95">
                    Ver Perfil & Agendar <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="localizacao" className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-savoir-navy mb-4 font-serif">Onde Estamos</h2>
            <div className="w-20 h-1 bg-savoir-gold mx-auto mb-6"></div>
            <p className="text-gray-600 flex items-center justify-center gap-2"><MapPin className="text-savoir-gold" size={20} /> Av. Tucuruvi, 654 - São Paulo, SP</p>
          </div>
          <div className="w-full h-96 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3659.1865910260655!2d-46.60621402377227!3d-23.492003858963593!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce5961ec909ba9%3A0xcda6b08e2ef87895!2sAv.%20Tucuruvi%2C%20654%20-%20Tucuruvi%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2002304-001!5e0!3m2!1spt-BR!2sbr!4v1708453489123!5m2!1spt-BR!2sbr" width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </section>

      <footer className="bg-savoir-navy text-white py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-2xl font-serif italic text-savoir-gold mb-4">Savoir Psi</h2>
            <p className="opacity-70 text-sm">Escuta, elaboração e transformação.</p>
            <p className="opacity-70 text-sm mt-2">Av. Tucuruvi, 654 - São Paulo, SP</p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL (POP-UP) COM A NOVA SELEÇÃO DINÂMICA DE HORÁRIOS */}
      {/* ========================================================================= */}
      {selectedPsi && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div className="absolute inset-0 bg-savoir-navy/90 backdrop-blur-sm" onClick={handleCloseModal}></div>

          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <button onClick={handleCloseModal} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-gray-100 z-20 text-gray-800 transition active:scale-90 shadow-sm"><X size={24} /></button>

            {/* COLUNA ESQUERDA: FORMULÁRIO */}
            <div className="md:w-5/12 bg-savoir-light p-6 flex flex-col items-center border-r border-gray-100">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-lg shrink-0">
                <img src={selectedPsi.foto} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-serif text-savoir-navy mb-1 leading-tight text-center">{selectedPsi.nome}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">CRP {selectedPsi.crp}</p>
              
              <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-1">
                <h4 className="font-bold text-savoir-navy mb-4 flex items-center gap-2 text-sm justify-center"><Calendar size={16} className="text-savoir-gold"/> Agendar Sessão</h4>

                {statusAgenda === 'success' ? (
                  <div className="text-center py-6 animate-fade-in text-green-600 h-full flex flex-col justify-center">
                    <CheckCircle size={40} className="mx-auto mb-2" />
                    <p className="font-bold text-sm">Horário Reservado!</p>
                    <p className="text-xs text-gray-500 mt-1">A clínica confirmará via WhatsApp.</p>
                  </div>
                ) : (
                  <form onSubmit={handleAgendar} className="flex flex-col gap-3 text-left">
                    <input required type="text" placeholder="Seu Nome Completo" className="w-full p-2 text-sm border rounded bg-gray-50 focus:border-savoir-gold focus:outline-none transition" value={formAgenda.nome} onChange={e => setFormAgenda({...formAgenda, nome: e.target.value})} />
                    <input required type="tel" placeholder="WhatsApp (Ex: 11999999999)" className="w-full p-2 text-sm border rounded bg-gray-50 focus:border-savoir-gold focus:outline-none transition" value={formAgenda.telefone} onChange={e => setFormAgenda({...formAgenda, telefone: e.target.value})} />
                    
                    <div className="relative">
                      <input 
                        required type="date" 
                        min={dataMinima} 
                        className="w-full p-2 text-sm border rounded bg-gray-50 focus:border-savoir-gold focus:outline-none text-gray-600 transition" 
                        value={formAgenda.data} 
                        onChange={e => setFormAgenda({...formAgenda, data: e.target.value})} 
                      />
                    </div>
                    
                    {/* ÁREA DOS BOTÕES DE HORÁRIO DINÂMICOS */}
                    <div className="mt-2 min-h-[100px] border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-2"><Clock size={12}/> Horários Disponíveis</label>
                      
                      {!formAgenda.data ? (
                        <p className="text-xs text-gray-400 text-center italic py-4">Selecione uma data acima primeiro.</p>
                      ) : statusHorarios === 'loading' ? (
                        <p className="text-xs text-savoir-gold text-center font-bold py-4 animate-pulse">Buscando agenda...</p>
                      ) : horariosDisponiveis.length === 0 ? (
                        <p className="text-xs text-red-400 text-center py-4 bg-red-50 rounded border border-red-100">Não há horários para esta data.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {horariosDisponiveis.map((hora) => (
                            <button
                              key={hora}
                              type="button"
                              onClick={() => setFormAgenda({...formAgenda, horario: hora})}
                              className={`py-2 px-1 text-xs font-bold rounded border transition-all ${formAgenda.horario === hora ? 'bg-savoir-gold text-white border-savoir-gold shadow-md transform scale-105' : 'bg-white text-savoir-navy border-gray-200 hover:border-savoir-gold hover:text-savoir-gold'}`}
                            >
                              {hora}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={statusAgenda === 'loading' || !formAgenda.horario} className="w-full bg-savoir-navy text-white py-3 rounded text-sm font-bold tracking-wider hover:bg-savoir-gold transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                      {statusAgenda === 'loading' ? 'Processando...' : 'Confirmar Horário'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: INFO DO PSI */}
            <div className="md:w-7/12 p-8 overflow-y-auto custom-scrollbar bg-white">
              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-savoir-navy font-bold text-lg mb-2 font-serif"><Brain className="text-savoir-gold" size={20}/> Sobre o Profissional</h4>
                <p className="text-gray-600 leading-relaxed text-sm">{selectedPsi.sobre}</p>
              </div>
              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-savoir-navy font-bold text-lg mb-2 font-serif"><BookOpen className="text-savoir-gold" size={20}/> Abordagem Clínica</h4>
                <div className="bg-savoir-light/50 p-4 rounded-lg border-l-4 border-savoir-gold"><p className="text-gray-700 italic text-sm">"{selectedPsi.abordagem}"</p></div>
              </div>
              <div>
                <h4 className="flex items-center gap-2 text-savoir-navy font-bold text-lg mb-3 font-serif"><GraduationCap className="text-savoir-gold" size={20}/> Formação Acadêmica</h4>
                <ul className="space-y-2">
                  {selectedPsi.formacao.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm border-b border-gray-100 pb-2 last:border-0"><div className="w-1.5 h-1.5 rounded-full bg-savoir-gold mt-1.5 shrink-0"></div>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
        @keyframes slide-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }
        .animate-slide-down { animation: slide-down 0.3s ease-in forwards; }
        html { scroll-behavior: smooth; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #C5A880; border-radius: 3px; }
      `}</style>
    </div>
  )
}