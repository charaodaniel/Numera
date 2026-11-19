import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogOut, Ticket } from 'lucide-react';
import { auth } from './lib/firebase';
import { signOutUser, syncUserProfile } from './lib/auth';
import { subscribeUserRifas } from './lib/api/rifas';
import { subscribeMyPendingInvites } from './lib/api/equipe';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { CreateRifaModal } from './components/CreateRifaModal';
import { InviteLinkAcceptModal } from './components/InviteLinkAcceptModal';
import { AuthScreen } from './views/AuthScreen';
import { MinhasRifasView } from './views/MinhasRifasView';
import { RifaDetailView } from './views/RifaDetailView';
import type { ConviteInbox, Rifa } from './types/numera';

function readConviteQueryParam(): string | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('convite');
  const trimmed = param?.trim() || '';
  return trimmed.length > 0 ? trimmed : null;
}

function clearConviteQueryParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('convite')) {
    url.searchParams.delete('convite');
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }
}

function NumeraShell() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [rifasLoading, setRifasLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<ConviteInbox[]>([]);
  const [selectedRifaId, setSelectedRifaId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [linkConviteId, setLinkConviteId] = useState<string | null>(() =>
    readConviteQueryParam()
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          await syncUserProfile(nextUser);
        } catch {
          // handled via structured error log
        }
      } else {
        setRifas([]);
        setPendingInvites([]);
        setSelectedRifaId(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setRifasLoading(true);
    const unsubRifas = subscribeUserRifas(user.uid, (list) => {
      setRifas(list);
      setRifasLoading(false);
    });
    const unsubInvites = user.email
      ? subscribeMyPendingInvites(user.email, setPendingInvites)
      : () => {};

    return () => {
      unsubRifas();
      unsubInvites();
    };
  }, [authReady, user]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm font-medium text-[#64686E]">
          <Ticket className="h-5 w-5 text-emerald-700 animate-pulse" />
          <span>Carregando Numera...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen hasInvite={Boolean(linkConviteId)} />;
  }

  const activeRifa = selectedRifaId
    ? rifas.find((r) => r.id === selectedRifaId) || null
    : null;

  const userDisplay =
    user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Conta';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#14171A] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-[#E6E4DD] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setSelectedRifaId(null)}
            className="text-xl font-extrabold tracking-tight text-[#14171A] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-md"
          >
            Numera
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64686E]">
            <button
              type="button"
              onClick={() => setSelectedRifaId(null)}
              className={`hover:text-[#14171A] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                selectedRifaId === null
                  ? 'text-[#14171A] font-semibold underline decoration-emerald-700 decoration-2 underline-offset-8'
                  : ''
              }`}
            >
              Minhas rifas
            </button>
            {pendingInvites.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedRifaId(null)}
                className="text-emerald-700 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 font-semibold"
              >
                Convites ({pendingInvites.length})
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => signOutUser()}
              title={`Conectado como ${user.email || ''} — Sair`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E6E4DD] bg-white px-3.5 py-2 text-xs font-medium text-[#374151] hover:bg-[#F3F1EC] hover:text-[#14171A] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <span className="hidden sm:inline font-medium">{userDisplay}</span>
              <span aria-hidden="true" className="hidden sm:inline text-[#D1CEC4]">
                ·
              </span>
              <LogOut className="h-3.5 w-3.5 text-[#64686E]" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 lg:py-9">
        {selectedRifaId ? (
          <RifaDetailView
            rifaId={selectedRifaId}
            initialRifa={activeRifa}
            user={user}
            onBack={() => setSelectedRifaId(null)}
          />
        ) : (
          <MinhasRifasView
            user={user}
            rifas={rifas}
            pendingInvites={pendingInvites}
            loading={rifasLoading}
            onOpenRifa={(id) => setSelectedRifaId(id)}
            onOpenCreate={() => setShowCreateModal(true)}
          />
        )}
      </main>

      <footer className="border-t border-[#E6E4DD] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-[#64686E] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Numera — organização centralizada de rifas e números.</span>
          <span>
            Plataforma organizacional · Vendas e confirmações são registradas
            manualmente pela equipe.
          </span>
        </div>
      </footer>

      {showCreateModal && (
        <CreateRifaModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={(rifaId) => {
            setShowCreateModal(false);
            setSelectedRifaId(rifaId);
          }}
        />
      )}

      {linkConviteId && (
        <InviteLinkAcceptModal
          conviteId={linkConviteId}
          user={user}
          rifas={rifas}
          rifasLoading={rifasLoading}
          onAccepted={(rifaId) => {
            clearConviteQueryParam();
            setLinkConviteId(null);
            setSelectedRifaId(rifaId);
          }}
          onClose={() => {
            clearConviteQueryParam();
            setLinkConviteId(null);
          }}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NumeraShell />
    </ErrorBoundary>
  );
}
