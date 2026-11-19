import React, { useState } from 'react';
import {
  Check,
  Clock,
  Grid3X3,
  Link2,
  ShieldCheck,
  Tag,
  Ticket,
  Users,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/auth';
import { PWAInstallButton } from '../components/PWAControls';

interface AuthScreenProps {
  hasInvite?: boolean;
}

const PREVIEW_TICKETS = [
  { n: '001', s: 'confirmado', owner: 'Ana Paula' },
  { n: '002', s: 'confirmado', owner: 'Carlos M.' },
  { n: '003', s: 'disponivel', owner: null },
  { n: '004', s: 'atribuido', owner: 'Fernanda' },
  { n: '005', s: 'reservado', owner: 'Lucas S.' },
  { n: '006', s: 'disponivel', owner: null },
  { n: '007', s: 'confirmado', owner: 'Marcos V.' },
  { n: '008', s: 'atribuido', owner: 'Juliana' },
  { n: '009', s: 'disponivel', owner: null },
  { n: '010', s: 'confirmado', owner: 'Rafael T.' },
  { n: '011', s: 'confirmado', owner: 'Beatriz' },
  { n: '012', s: 'reservado', owner: 'Gustavo' },
  { n: '013', s: 'disponivel', owner: null },
  { n: '014', s: 'confirmado', owner: 'Patrícia' },
  { n: '015', s: 'atribuido', owner: 'Henrique' },
] as const;

export const AuthScreen: React.FC<AuthScreenProps> = ({
  hasInvite = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<
    (typeof PREVIEW_TICKETS)[number]
  >(PREVIEW_TICKETS[0]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir a autenticação com o Google.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#14171A] flex flex-col">
      <header className="border-b border-[#E6E4DD] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <span className="text-xl font-extrabold tracking-tight text-[#14171A] whitespace-nowrap shrink-0">
            Numera
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="rounded-lg bg-[#14171A] px-4 py-2 text-sm font-medium text-white hover:bg-[#272B30] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              {loading ? 'Entrando...' : 'Entrar com Google'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 lg:py-16">
        <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-medium tracking-wide text-emerald-800">
              Organização de rifas · Grade numérica e equipe · PWA
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#14171A] sm:text-5xl leading-[1.1] [text-wrap:balance]">
              Suas rifas e números organizados em um só talonário digital.
            </h1>
            <p className="max-w-2xl text-base text-[#4B5563] leading-relaxed">
              Centralize a distribuição de números vendidos presencialmente ou
              pelo WhatsApp. Cadastre participantes, convide vendedores por link,
              acompanhe confirmações manuais e realize sorteios auditáveis.
            </p>

            {hasInvite && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-950">
                <div className="flex items-center gap-2 font-semibold">
                  <Link2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Você abriu um link de convite de equipe</span>
                </div>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  Entre com sua conta Google abaixo para visualizar os detalhes
                  da rifa e vincular seu acesso automaticamente.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors min-h-[46px] whitespace-nowrap shrink-0"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                {loading ? 'Conectando conta...' : 'Acessar com conta Google'}
              </button>
              <span className="text-xs text-[#64686E]">
                Sem checkout ou cobranças — controle 100% organizacional.
              </span>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[#E6E4DD] pt-8">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#14171A]">
                  <Grid3X3 className="h-4 w-4 text-emerald-700" />
                  <span>Grade exclusiva</span>
                </div>
                <p className="mt-1.5 text-xs text-[#4B5563] leading-relaxed">
                  Números sequenciais sem duplicidade nem sobreposição.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#14171A]">
                  <Users className="h-4 w-4 text-emerald-700" />
                  <span>Equipe por link</span>
                </div>
                <p className="mt-1.5 text-xs text-[#4B5563] leading-relaxed">
                  Adicione colaboradores e vendedores com permissões por rifa.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#14171A]">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>Sorteio auditável</span>
                </div>
                <p className="mt-1.5 text-xs text-[#4B5563] leading-relaxed">
                  Histórico completo e exportação pronta em CSV e JSON.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#E6E4DD] bg-white p-6">
              <div className="flex items-start justify-between gap-3 border-b border-[#F0EFE9] pb-4">
                <div>
                  <p className="text-base font-bold text-[#14171A]">
                    Rifa da Bicicleta Aro 29
                  </p>
                  <p className="mt-0.5 text-xs text-[#64686E] font-mono tabular-nums">
                    Ativa · 100 números · 62% ocupada
                  </p>
                </div>
                <Ticket className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2 font-mono text-xs tabular-nums">
                {PREVIEW_TICKETS.map((cell) => {
                  const isSelected = selectedPreview.n === cell.n;
                  const style =
                    cell.s === 'confirmado'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : cell.s === 'atribuido'
                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                        : cell.s === 'reservado'
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#374151] hover:border-[#CFCBC0]';
                  return (
                    <button
                      key={cell.n}
                      type="button"
                      onClick={() => setSelectedPreview(cell)}
                      className={`flex flex-col items-center justify-center rounded-lg border py-2 font-medium transition-colors min-h-[44px] ${style} ${
                        isSelected ? 'ring-2 ring-[#14171A] ring-offset-1' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {cell.n}
                        {cell.s === 'confirmado' && (
                          <Check className="h-2.5 w-2.5 text-emerald-700" />
                        )}
                        {cell.s === 'reservado' && (
                          <Clock className="h-2.5 w-2.5 text-amber-700" />
                        )}
                        {cell.s === 'atribuido' && (
                          <Tag className="h-2.5 w-2.5 text-sky-700" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl bg-[#FAF9F6] px-4 py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold tabular-nums text-[#14171A]">
                    Número #{selectedPreview.n}
                  </span>
                  <span className="font-medium text-[#4B5563]">
                    {selectedPreview.s === 'confirmado'
                      ? 'Confirmado'
                      : selectedPreview.s === 'atribuido'
                        ? 'Atribuído'
                        : selectedPreview.s === 'reservado'
                          ? 'Reservado'
                          : 'Disponível'}
                  </span>
                </div>
                <p className="mt-1 text-[#64686E]">
                  {selectedPreview.owner
                    ? `Participante: ${selectedPreview.owner}`
                    : 'Toque para selecionar um número disponível na grade.'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64686E]">
                <span>Disponível</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-800">Reservado</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-800">Atribuído</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-800 font-medium">Confirmado</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
