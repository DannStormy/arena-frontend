import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useAdminTournaments,
  useCreateTournament,
  useChangeTournamentStatus,
  type CreateTournamentInput,
} from '@/hooks/use-admin';
import { ARENA_CONFIG } from '@/lib/arena-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-arena-gold/10 text-arena-gold',
  active: 'bg-green-400/10 text-green-400',
  completed: 'bg-white/10 text-white/60',
  cancelled: 'bg-arena-red/10 text-arena-red',
};

const STATUSES = ['open', 'active', 'completed', 'cancelled'];
const GAME_TYPES = ['quiz', 'rapid_fire'];

const EMPTY_FORM: CreateTournamentInput & { prizeSecondStr: string; prizeThirdStr: string; maxPlayersStr: string } = {
  title: '',
  arena: Object.keys(ARENA_CONFIG)[0],
  gameType: 'quiz',
  prizeFirst: 0,
  prizeSecond: undefined,
  prizeThird: undefined,
  minPlayers: 2,
  maxPlayers: undefined,
  prizeSecondStr: '',
  prizeThirdStr: '',
  maxPlayersStr: '',
};

export function AdminTournamentsPage() {
  const navigate = useNavigate();
  const { data: tournaments, isLoading, error } = useAdminTournaments();
  const createMutation = useCreateTournament();
  const statusMutation = useChangeTournamentStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCreate = async () => {
    const payload: CreateTournamentInput = {
      title: form.title,
      arena: form.arena,
      gameType: form.gameType,
      prizeFirst: Number(form.prizeFirst),
      minPlayers: Number(form.minPlayers),
    };
    if (form.prizeSecondStr) payload.prizeSecond = Number(form.prizeSecondStr);
    if (form.prizeThirdStr) payload.prizeThird = Number(form.prizeThirdStr);
    if (form.maxPlayersStr) payload.maxPlayers = Number(form.maxPlayersStr);

    await createMutation.mutateAsync(payload);
    setCreateOpen(false);
    setForm(EMPTY_FORM);
  };

  const selectStyle =
    'h-9 w-full rounded-lg border border-arena-border bg-arena-bg px-2.5 text-sm text-white outline-none focus:border-white/40 appearance-none';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Tournaments</h1>
          <p className="text-white/40 text-sm mt-0.5">{tournaments?.length ?? 0} total</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {error && <ErrorMessage message="Failed to load tournaments." />}

      {tournaments && tournaments.length === 0 && (
        <p className="text-white/40 text-sm text-center py-12">No tournaments yet.</p>
      )}

      {tournaments && tournaments.length > 0 && (
        <div className="rounded-xl border border-arena-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arena-border bg-arena-surface">
                <th className="text-left text-white/50 font-medium px-4 py-3">Title</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Status</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Players</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Prize Pool</th>
                <th className="text-right text-white/50 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-b border-arena-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{t.title}</p>
                    <p className="text-white/40 text-xs capitalize">{t.arena.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-4 py-3">
                    {changingStatus === t.id ? (
                      <select
                        className={`${selectStyle} w-32`}
                        defaultValue={t.status}
                        autoFocus
                        onBlur={() => setChangingStatus(null)}
                        onChange={(e) => {
                          statusMutation.mutate({ id: t.id, status: e.target.value });
                          setChangingStatus(null);
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[t.status] ?? 'bg-white/10 text-white/60'}`}
                      >
                        {t.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{t.playerCount}</td>
                  <td className="px-4 py-3 text-white/70">
                    ₦{Number(t.prizeFirst).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/tournaments/${t.id}`)}
                        className="text-xs text-arena-gold hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setChangingStatus(t.id)}
                        className="text-xs text-white/50 hover:text-white"
                      >
                        Change Status
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="bg-arena-surface border-arena-border text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create Tournament</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="bg-arena-bg border-arena-border text-white placeholder:text-white/30"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Arena</label>
                <select className={selectStyle} value={form.arena} onChange={(e) => set('arena', e.target.value)}>
                  {Object.entries(ARENA_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Game type</label>
                <select className={selectStyle} value={form.gameType} onChange={(e) => set('gameType', e.target.value)}>
                  {GAME_TYPES.map((g) => (
                    <option key={g} value={g} className="capitalize">{g.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">1st prize (₦)</label>
              <Input type="number" value={form.prizeFirst} onChange={(e) => set('prizeFirst', e.target.value)} className="bg-arena-bg border-arena-border text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">2nd prize (optional)</label>
                <Input type="number" placeholder="—" value={form.prizeSecondStr} onChange={(e) => set('prizeSecondStr', e.target.value)} className="bg-arena-bg border-arena-border text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">3rd prize (optional)</label>
                <Input type="number" placeholder="—" value={form.prizeThirdStr} onChange={(e) => set('prizeThirdStr', e.target.value)} className="bg-arena-bg border-arena-border text-white placeholder:text-white/30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Min players</label>
                <Input type="number" value={form.minPlayers} onChange={(e) => set('minPlayers', e.target.value)} className="bg-arena-bg border-arena-border text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Max players (optional)</label>
                <Input type="number" placeholder="—" value={form.maxPlayersStr} onChange={(e) => set('maxPlayersStr', e.target.value)} className="bg-arena-bg border-arena-border text-white placeholder:text-white/30" />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-transparent border-0 -mx-0 -mb-0 pt-2 px-0 pb-0">
            <Button variant="outline" className="border-arena-border text-white/70 hover:bg-white/5" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.title || createMutation.isPending}
              className="bg-arena-gold hover:bg-arena-gold/90 text-black font-semibold"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
