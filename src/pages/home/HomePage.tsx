import { Link } from 'react-router-dom';
import { useTournaments } from '@/hooks/use-tournaments';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { ARENA_LUCIDE_ICONS } from '@/lib/arena-icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { Tournament, TournamentArena } from '@/types/tournament.types';

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const arena = ARENA_CONFIG[tournament.arena];

  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <Card className="bg-arena-surface border-arena-border hover:border-white/15 hover:bg-arena-elev transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-arena-text-primary font-semibold truncate font-display">{tournament.title}</p>
              <p className="text-arena-text-tertiary text-xs mt-0.5">
                {tournament.entryCount ?? 0} / {tournament.maxPlayers ?? '∞'} players
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge
                className="text-xs font-medium text-black"
                style={{ backgroundColor: arena.color }}
              >
                {arena.label}
              </Badge>
              {tournament.hasJoined && (
                <Badge className="text-xs bg-arena-purple/20 text-arena-purple-bright border border-arena-purple/30 font-medium">
                  ✓ Joined
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-arena-gold font-semibold">
              ₦{Number(tournament.prizeFirst).toLocaleString()}
            </span>
            <span className="text-arena-text-tertiary">
              Entry: ₦{Number(tournament.entryFee).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const { data: tournaments, isLoading, error } = useTournaments({ status: 'open' });

  const byArena = (tournaments?.data ?? []).reduce<Record<string, Tournament[]>>((acc, t) => {
    acc[t.arena] = [...(acc[t.arena] ?? []), t];
    return acc;
  }, {});

  return (
    <div className="min-h-full bg-arena-bg">
      <header className="px-4 pt-4 pb-5 border-b border-arena-border bg-arena-surface/50">
        <div className="mx-auto w-full max-w-[760px]">
          <h1 className="font-display text-2xl font-bold text-arena-text-primary">Tournaments</h1>
          <p className="text-arena-text-tertiary text-sm mt-0.5">Compete and win real prizes</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[760px] px-4 py-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <EmptyState
            title="Couldn't load tournaments"
            description="Pull to refresh or try again later"
            icon="⚠️"
          />
        )}

        {!isLoading && !error && Object.keys(byArena).length === 0 && (
          <EmptyState
            title="No open tournaments"
            description="Check back soon for new competitions"
            icon="🏟️"
          />
        )}

        {!isLoading &&
          (Object.keys(ARENA_CONFIG) as TournamentArena[]).map((arenaKey) => {
            const list = byArena[arenaKey];
            if (!list || list.length === 0) return null;
            const arena = ARENA_CONFIG[arenaKey];

            return (
              <section key={arenaKey} className="mb-6">
                <h2 className="font-display font-semibold text-arena-text-secondary text-sm mb-3 flex items-center gap-2">
                  <span className="text-arena-text-tertiary flex items-center">
                    {ARENA_LUCIDE_ICONS[arenaKey]}
                  </span>
                  <span>{arena.label}</span>
                </h2>

                {/* 1-col on mobile, 2-col on wide screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map((t) => (
                    <TournamentCard key={t.id} tournament={t} />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
