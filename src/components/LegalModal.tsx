
import React, { useState } from 'react';

interface Props {
  initialTab?: 'PRIVACY' | 'SECURITY' | 'TERMS';
  onClose: () => void;
}

export const LegalModal: React.FC<Props> = ({ initialTab = 'PRIVACY', onClose }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-950 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-scale-balanced text-blue-600"></i> Centro Legal Biz-Flow
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition">
            <i className="fa-solid fa-times text-slate-500"></i>
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-1/3 md:w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 space-y-2 overflow-y-auto">
             <button 
                onClick={() => setActiveTab('PRIVACY')}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'PRIVACY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
                Política de Privacidade
             </button>
             <button 
                onClick={() => setActiveTab('SECURITY')}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'SECURITY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
                Segurança de Dados
             </button>
             <button 
                onClick={() => setActiveTab('TERMS')}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'TERMS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
             >
                Termos de Uso
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 leading-relaxed text-sm scrollbar-thin">
            
            {activeTab === 'PRIVACY' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">1. Política de Privacidade – Biz-Flow</h3>
                <p>Biz-Flow (biz-flow.cloud) valoriza sua privacidade e protege seus dados pessoais. Esta política explica como coletamos, usamos e protegemos suas informações.</p>
                
                <h4 className="font-bold text-slate-900 dark:text-white mt-4">Informações que coletamos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Nome, e-mail e telefone fornecidos ao criar conta.</li>
                  <li>Informações financeiras (planos e pagamentos).</li>
                  <li>Dados de uso do software (como número de documentos, relatórios e login).</li>
                  <li>Cookies e dados de navegação para melhorar a experiência do usuário.</li>
                </ul>

                <h4 className="font-bold text-slate-900 dark:text-white mt-4">Como usamos suas informações</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Para fornecer os serviços do Biz-Flow.</li>
                  <li>Para processar pagamentos e gerenciar assinaturas.</li>
                  <li>Para enviar comunicações sobre atualizações e suporte.</li>
                  <li>Para melhorar nossos produtos, funcionalidades e segurança.</li>
                </ul>

                <h4 className="font-bold text-slate-900 dark:text-white mt-4">Compartilhamento de informações</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Não vendemos seus dados a terceiros.</li>
                  <li>Compartilhamos apenas quando necessário para operar a plataforma (por exemplo, provedores de pagamento, serviços de nuvem).</li>
                </ul>

                <h4 className="font-bold text-slate-900 dark:text-white mt-4">Segurança</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Utilizamos criptografia SSL para proteger dados transmitidos.</li>
                  <li>Armazenamento seguro com backups regulares.</li>
                  <li>Acesso restrito aos dados apenas para pessoal autorizado.</li>
                </ul>

                <h4 className="font-bold text-slate-900 dark:text-white mt-4">Direitos do usuário</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Solicitar acesso aos dados que coletamos sobre você.</li>
                  <li>Corrigir, atualizar ou excluir seus dados.</li>
                  <li>Cancelar sua conta a qualquer momento.</li>
                </ul>
              </div>
            )}

            {activeTab === 'SECURITY' && (
              <div className="space-y-6 animate-fadeIn">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">2. Política de Segurança / Proteção de Dados – Biz-Flow</h3>
                 <p>Biz-Flow adota medidas técnicas e organizacionais para proteger seus dados e garantir confiabilidade da plataforma:</p>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Medidas de segurança</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Criptografia de ponta a ponta (SSL/TLS) nas transmissões de dados.</li>
                   <li>Senhas armazenadas com hashing seguro.</li>
                   <li>Backup diário em servidores seguros na nuvem.</li>
                   <li>Monitoramento contínuo para detectar atividades suspeitas.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Responsabilidade do usuário</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Mantenha sua senha segura e confidencial.</li>
                   <li>Informe imediatamente caso perceba acesso não autorizado à sua conta.</li>
                   <li>Evite compartilhar informações sensíveis fora da plataforma.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Conformidade</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Adequado às normas internacionais de proteção de dados.</li>
                   <li>Podemos atualizar a política para atender legislações locais, como GDPR (UE) ou LGPD (Brasil).</li>
                 </ul>
              </div>
            )}

            {activeTab === 'TERMS' && (
              <div className="space-y-6 animate-fadeIn">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">3. Termos de Uso / Condições Gerais – Biz-Flow</h3>
                 <p>Ao utilizar o Biz-Flow (biz-flow.cloud), você concorda com os seguintes termos:</p>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Uso da plataforma</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>O software é destinado a gerenciamento financeiro, emissão de faturas e recibos.</li>
                   <li>Você concorda em fornecer informações verdadeiras e precisas ao criar sua conta.</li>
                   <li>É proibido usar a plataforma para atividades ilegais ou fraudulentas.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Planos e pagamentos</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Planos pagos são cobrados conforme valores divulgados na landing page.</li>
                   <li>Pagamentos não são reembolsáveis, exceto se houver falha técnica comprovada.</li>
                   <li>Biz-Flow reserva-se o direito de alterar preços mediante aviso prévio.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Responsabilidades</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Biz-Flow não se responsabiliza por perdas financeiras externas decorrentes do uso da plataforma.</li>
                   <li>Manteremos a plataforma segura, mas não podemos garantir 100% de disponibilidade contínua.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Rescisão</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Usuários podem cancelar suas contas a qualquer momento.</li>
                   <li>Biz-Flow pode suspender contas que violem os termos de uso.</li>
                 </ul>

                 <h4 className="font-bold text-slate-900 dark:text-white mt-4">Modificações</h4>
                 <ul className="list-disc pl-5 space-y-1">
                   <li>Biz-Flow pode atualizar estes termos e políticas periodicamente.</li>
                   <li>As alterações entram em vigor imediatamente após publicação na plataforma.</li>
                 </ul>
              </div>
            )}

          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-right">
           <button onClick={onClose} className="bg-slate-900 dark:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:opacity-90 transition">
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};
