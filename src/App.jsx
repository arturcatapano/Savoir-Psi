import { useState, useEffect } from 'react'
import { Menu, X, MessageCircle, Brain, Heart, Users, GraduationCap, BookOpen, ChevronRight, MapPin, Calendar, CheckCircle, Clock } from 'lucide-react'
import { supabase } from './supabase'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedPsi, setSelectedPsi] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  
  const [formAgenda, setFormAgenda] = useState({ nome: '', telefone: '', data: '', horario: '' })
  const [statusAgenda, setStatusAgenda] = useState('idle')
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([])
  const [statusHorarios, setStatusHorarios] = useState('idle')

  // Estado para guardar os IDs reais do banco de dados
  const [psicologosDB, setPsicologosDB] = useState([])

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataMinima = amanha.toISOString().split('T')[0];

  // BUSCA OS IDs DOS PSICÓLOGOS NO BANCO AO ABRIR O SITE
  useEffect(() => {
    const fetchPsi = async () => {
      const { data } = await supabase.from('psicologos').select('*')
      if (data) setPsicologosDB(data)
    }
    fetchPsi()
  }, [])

// =========================================================================
  // A MÁQUINA MATEMÁTICA DE HORÁRIOS (AGORA À PROVA DE ERROS 406)
  // =========================================================================
  useEffect(() => {
    const calcularHorariosDisponiveis = async () => {
      if (!formAgenda.data || !selectedPsi) return;
      
      setStatusHorarios('loading')
      setFormAgenda(prev => ({ ...prev, horario: '' })) // Limpa o horário se mudar o dia

      try {
        // 1. Descobrir qual é o dia da semana
        const dataObj = new Date(formAgenda.data + 'T12:00:00')
        const diaSemana = dataObj.getDay()

        // 2. Buscar no Supabase SEM o .single() para não dar Erro 406
        const { data: turnosEncontrados, error: erroConfig } = await supabase
          .from('config_agenda')
          .select('*')
          .eq('psicologa', selectedPsi.nome)
          .eq('dia_semana', diaSemana)

        // Pega o primeiro turno que o banco achar (ignora se houver duplicatas fantasmas)
        const configTurno = turnosEncontrados && turnosEncontrados.length > 0 ? turnosEncontrados[0] : null

        // Se não tiver turno cadastrado ou der erro
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
          const h = Math.floor(tempoAtualEmMinutos / 60).toString().padStart(2, '0')
          const m = (tempoAtualEmMinutos % 60).toString().padStart(2, '0')
          slotsGerados.push(`${h}:${m}`)
          
          tempoAtualEmMinutos += duracaoSessao
        }

        // 4. Buscar agendamentos ocupados
        const { data: agendados } = await supabase
          .from('agendamentos')
          .select('horario')
          .eq('psicologa', selectedPsi.nome)
          .eq('data_agendamento', formAgenda.data)

        const horariosOcupados = agendados ? agendados.map(a => a.horario) : []

        // 5. Filtrar os livres
        const slotsLivres = slotsGerados.filter(slot => !horariosOcupados.includes(slot))

        setHorariosDisponiveis(slotsLivres)
        setStatusHorarios('done')

      } catch (error) {
        console.error("Erro ao calcular horários:", error)
        setStatusHorarios('erro')
      }
    }

    calcularHorariosDisponiveis()
  }, [formAgenda.data, selectedPsi])

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
    if (!formAgenda.horario) return alert('Selecione um horário!')
    setStatusAgenda('loading')

    const psiDb = psicologosDB.find(p => p.nome === selectedPsi.nome)

    // Tenta inserir. Se a trava do banco bloquear (dois clicando juntos), ele cai no erro.
    const { error } = await supabase.from('agendamentos').insert([{
      nome_paciente: formAgenda.nome,
      telefone_paciente: formAgenda.telefone,
      psicologa: selectedPsi.nome, // Mantemos por garantia de leitura fácil
      psicologo_id: psiDb.id, // A RELAÇÃO REAL
      data_agendamento: formAgenda.data,
      horario: formAgenda.horario
    }])

    if (error) {
      alert('Horário indisponível! Outra pessoa pode ter agendado neste exato momento. Por favor, escolha outro horário.')
      setStatusAgenda('idle')
      // Força a recarregar a data para atualizar os botões
      setFormAgenda(prev => ({ ...prev, data: '' })) 
    } else {
      setStatusAgenda('success')
      setTimeout(() => { handleCloseModal() }, 3000)
    }
  }

  // --- DADOS VISUAIS DA EQUIPE ---
  const equipe = [
    {
      nome: "Psi. Lucas Barba", crp: "06/145904", especialidade: "Sexologia & Saúde Pública", foto: "/lucas.jpeg", link: "https://wa.me/5511940197767",
      sobre: "Sou formado em psicologia desde 2017. Atendo adolescentes, adultos e a terceira idade. Construí uma ampla formação em gestão de saúde e possuo especialização em sexualidade humana.",
      formacao: ["Pós-graduação em Sexologia - Instituto Paulista de Sexualidade (2020)", "Pós-graduação em Saúde Mental - Faculdade Unyleya (2022)", "Pós-graduação em Gestão em Saúde Pública - Estácio (2021)", "Capacitação em Distúrbios Alimentares Pediátricos - Santa Marcelina (2024)", "Terapia das Sexualidades (disfunções femininas e masculinas)"],
      abordagem: "Minha atuação é focada na saúde integral. Ofereço acolhimento seguro e livre de tabus para questões de sexualidade, distúrbios alimentares e saúde mental geral."
    },
    {
      nome: "Psi. Alini Correia", crp: "06/153091", especialidade: "TCC, Neuropsicologia & Sexologia", foto: "/alini.jpeg", link: "https://wa.me/5511965029254",
      sobre: "Com 7 anos de experiência clínica, educacional e social. Minha trajetória é marcada por um olhar amplo e humanizado. Atendo crianças, adolescentes, adultos e casais.",
      formacao: ["Especialista em Sexologia Aplicada - Inst. Paulista de Sexualidade", "Formação em Neuropsicologia - FMU", "Graduação em Psicologia - Faculdade Anhanguera", "Experiência em Terapia de Casais e Saúde Sexual"],
      abordagem: "Terapia Cognitivo-Comportamental (TCC). Utilizo ferramentas práticas para transformar padrões de pensamento e comportamento. Trabalho também com identidade de gênero e fortalecimento de vínculos afetivos."
    }
  ]

  return (
    <div className="min-h-screen flex flex-col relative bg-folha-light font-sans text-folha-text">
      
      <nav className="bg-folha-dark/90 backdrop-blur-md text-white py-4 px-6 fixed w-full z-40 shadow-lg transition-all duration-300">
        <div className="max-w-6xl mx-auto flex justify-center items-center relative min-h-[40px] py-1">
          <div className="hidden md:flex gap-8 text-sm uppercase tracking-wide">
            <a href="#home" className="hover:text-folha-accent transition relative group">Início <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-folha-accent transition-all group-hover:w-full"></span></a>
            <a href="#sobre" className="hover:text-folha-accent transition relative group">A Clínica <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-folha-accent transition-all group-hover:w-full"></span></a>
            <a href="#equipe" className="hover:text-folha-accent transition relative group">Profissionais <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-folha-accent transition-all group-hover:w-full"></span></a>
            <a href="#localizacao" className="hover:text-folha-accent transition relative group">Localização <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-folha-accent transition-all group-hover:w-full"></span></a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden absolute right-4 text-folha-accent active:scale-90 transition">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-folha-dark border-t border-gray-700 flex flex-col p-4 gap-4 text-center shadow-xl animate-fade-in">
            <a href="#home" onClick={() => setMenuOpen(false)}>Início</a>
            <a href="#sobre" onClick={() => setMenuOpen(false)}>A Clínica</a>
            <a href="#equipe" onClick={() => setMenuOpen(false)}>Profissionais</a>
            <a href="#localizacao" onClick={() => setMenuOpen(false)}>Localização</a>
          </div>
        )}
      </nav>

      <section id="home" className="relative h-screen flex items-center justify-center bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80')"}}>
        <div className="absolute inset-0 bg-folha-dark/70"></div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl animate-fade-in-up flex flex-col items-center">
          <img src="/logo.png" alt="Folha da Alma" className="h-48 md:h-64 mb-8 drop-shadow-2xl hover:scale-105 transition-transform duration-700" />
          <p className="text-[#DCCDB7] uppercase tracking-[0.2em] text-sm mb-4 font-bold">Psicologia Clínica Integrada</p>
          <h1 className="text-5xl md:text-7xl mb-6 leading-tight font-serif">Cuidar da sua mente <br/> <span className="italic text-[#DCCDB7]">é nutrir a sua vida.</span></h1>
          <button onClick={() => document.getElementById('equipe').scrollIntoView({ behavior: 'smooth' })} className="btn-accent inline-block mt-8 cursor-pointer active:scale-95 transform transition duration-150">Conheça Nossa Equipe</button>
        </div>
      </section>

      <section id="sobre" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl text-folha-dark mb-6 font-serif">O Conceito Folha da Alma</h2>
            <div className="w-20 h-1 bg-folha-accent mb-6"></div>
            <p className="text-gray-600 leading-relaxed mb-4">Na <strong>Folha da Alma</strong>, Somos uma equipe multidisciplinar unida pelo propósito de oferecer um espaço de escuta qualificada e transformação. <br/>
            <br/>
            Afinal, cuidar da mente é plantar hoje as sementes de uma vida mais leve.</p>
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[{ icon: Brain, label: "Autonomia" }, { icon: Heart, label: "Acolhimento" }, { icon: Users, label: "Vínculo" }].map((item, i) => (
                <div key={i} className="text-center p-4 bg-folha-light rounded-lg hover:shadow-md hover:-translate-y-1 transition duration-300 cursor-default">
                  <item.icon className="mx-auto text-folha-dark mb-2" /><span className="text-xs font-bold uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div><img src="https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80" className="rounded-lg shadow-xl hover:shadow-2xl transition duration-500" /></div>
        </div>
      </section>

      <section id="equipe" className="py-20 px-6 bg-folha-light">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl text-folha-dark mb-12 font-serif">Nossos Especialistas</h2>
          <div className="grid grid-cols-1 gap-8 mx-auto max-w-4xl justify-center">
            {equipe.map((psi, index) => (
              <div key={index} className="bg-white rounded-xl overflow-hidden shadow-lg hover:-translate-y-2 transition duration-300 group flex flex-col md:flex-row h-full border border-gray-100">
                <div className="h-72 md:h-auto md:w-5/12 overflow-hidden relative shrink-0">
                   <div className="absolute inset-0 bg-folha-dark/0 group-hover:bg-folha-dark/20 transition duration-500 z-10"></div>
                   <img src={psi.foto} className="w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition duration-500" />
                </div>
                <div className="p-8 text-left relative flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-2xl text-folha-dark mb-1 font-serif font-bold leading-tight">{psi.nome}</h3>
                    <p className="text-folha-accent font-bold text-[10px] uppercase tracking-wide flex items-center">CRP {psi.crp} | {psi.especialidade}</p>
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-4">
                      <p className="text-gray-600 leading-relaxed text-sm">{psi.sobre}</p>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="flex items-center gap-2 text-folha-dark font-bold text-sm mb-1"><Brain className="text-folha-accent" size={16}/> Abordagem</h4>
                      <p className="text-gray-600 italic text-sm border-l-2 border-folha-accent pl-3">"{psi.abordagem}"</p>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="flex items-center gap-2 text-folha-dark font-bold text-sm mb-2"><GraduationCap className="text-folha-accent" size={16}/> Formação</h4>
                      <ul className="space-y-1">
                        {psi.formacao.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-600 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-folha-accent mt-1 shrink-0"></div>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <a href={psi.link} target="_blank" rel="noopener noreferrer" className="w-full mt-auto bg-green-500 text-white py-3 rounded text-sm hover:bg-green-600 transition flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg active:scale-95">
                    <MessageCircle size={18} /> Falar no WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="localizacao" className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-folha-dark mb-4 font-serif">Onde Estamos</h2>
            <div className="w-20 h-1 bg-folha-accent mx-auto mb-6"></div>
            <p className="text-gray-600 flex items-center justify-center gap-2"><MapPin className="text-folha-accent" size={20} /> Av. Tucuruvi, 654 - São Paulo, SP</p>
          </div>
          <div className="w-full h-96 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3659.1865910260655!2d-46.60621402377227!3d-23.492003858963593!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce5961ec909ba9%3A0xcda6b08e2ef87895!2sAv.%20Tucuruvi%2C%20654%20-%20Tucuruvi%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2002304-001!5e0!3m2!1spt-BR!2sbr!4v1708453489123!5m2!1spt-BR!2sbr" width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </section>

      <footer className="bg-folha-dark text-white py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
            <img src="/logo.png" alt="Folha da Alma" className="h-20 mx-auto mb-4" />
            <p className="opacity-70 text-sm">Cuidar da sua mente é nutrir a sua vida.</p>
        </div>
      </footer>

      {/* MODAL DE AGENDA DO PACIENTE */}
      {selectedPsi && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div className="absolute inset-0 bg-folha-dark/90 backdrop-blur-sm" onClick={handleCloseModal}></div>

          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <button onClick={handleCloseModal} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-gray-100 z-20 text-gray-800 transition active:scale-90 shadow-sm"><X size={24} /></button>

            <div className="md:w-5/12 bg-folha-light p-6 flex flex-col items-center border-r border-gray-100">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-lg shrink-0">
                <img src={selectedPsi.foto} className="w-full h-full object-cover object-top" />
              </div>
              <h3 className="text-xl font-serif text-folha-dark mb-1 leading-tight text-center">{selectedPsi.nome}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">CRP {selectedPsi.crp}</p>
              
              <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col justify-center items-center text-center">
                <MessageCircle size={40} className="text-green-500 mb-4" />
                <h4 className="font-bold text-folha-dark mb-2 text-lg">Agendar Sessão</h4>
                <p className="text-sm text-gray-500 mb-6">Entre em contato diretamente via WhatsApp para agendar seu horário.</p>
                <a href={selectedPsi.link} target="_blank" rel="noopener noreferrer" className="w-full bg-green-500 text-white py-3 rounded text-sm font-bold tracking-wider hover:bg-green-600 transition flex justify-center items-center gap-2 shadow-md hover:shadow-lg">
                  <MessageCircle size={18} /> Falar no WhatsApp
                </a>
              </div>
            </div>

            <div className="md:w-7/12 p-8 overflow-y-auto custom-scrollbar bg-white">
              <div className="mb-6"><h4 className="flex items-center gap-2 text-folha-dark font-bold text-lg mb-2 font-serif"><Brain className="text-folha-accent" size={20}/> Sobre o Profissional</h4><p className="text-gray-600 leading-relaxed text-sm">{selectedPsi.sobre}</p></div>
              <div className="mb-6"><h4 className="flex items-center gap-2 text-folha-dark font-bold text-lg mb-2 font-serif"><BookOpen className="text-folha-accent" size={20}/> Abordagem Clínica</h4><div className="bg-folha-light/50 p-4 rounded-lg border-l-4 border-folha-accent"><p className="text-gray-700 italic text-sm">"{selectedPsi.abordagem}"</p></div></div>
              <div>
                <h4 className="flex items-center gap-2 text-folha-dark font-bold text-lg mb-3 font-serif"><GraduationCap className="text-folha-accent" size={20}/> Formação Acadêmica</h4>
                <ul className="space-y-2">
                  {selectedPsi.formacao.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm border-b border-gray-100 pb-2 last:border-0"><div className="w-1.5 h-1.5 rounded-full bg-folha-accent mt-1.5 shrink-0"></div>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } } .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
        @keyframes slide-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } } .animate-slide-down { animation: slide-down 0.3s ease-in forwards; }
        html { scroll-behavior: smooth; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #C5A880; border-radius: 3px; }
      `}</style>
    </div>
  )
}
