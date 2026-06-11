import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { matchmakingAPI } from '../services/api'

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'pro']
const SKILL_COLORS = {
  beginner: 'bg-blue-50 text-blue-700 border-blue-200',
  intermediate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  advanced: 'bg-orange-50 text-orange-700 border-orange-200',
  pro: 'bg-red-50 text-red-700 border-red-200',
}

function SkillBadge({ level }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${SKILL_COLORS[level] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {level}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Post Availability ──────────────────────────────────────────────────────

function PostAvailabilityForm({ onPosted }) {
  const { authHeader } = useAuth()
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time_start: '09:00',
    time_end: '11:00',
    venue_name: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await matchmakingAPI.postAvailability(form, authHeader())
      onPosted()
      setForm(f => ({ ...f, venue_name: '', notes: '' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 text-sm">Post your availability</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => set('date', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="time"
              value={form.time_start}
              onChange={e => set('time_start', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="time"
              value={form.time_end}
              onChange={e => set('time_end', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Preferred venue (optional)</label>
        <input
          value={form.venue_name}
          onChange={e => set('venue_name', e.target.value)}
          placeholder="e.g. Padel Club Madrid"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <input
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="e.g. Happy to play anywhere nearby"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {saving ? 'Posting…' : 'Post availability'}
      </button>
    </form>
  )
}

// ─── Invite Modal ────────────────────────────────────────────────────────────

function InviteModal({ target, onClose, onSent }) {
  const { authHeader } = useAuth()
  const [form, setForm] = useState({
    proposed_date: new Date().toISOString().slice(0, 10),
    proposed_time_start: '10:00',
    proposed_time_end: '11:30',
    proposed_venue_name: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      await matchmakingAPI.sendInvitation({
        invitee_id: target.user_id || target.id,
        ...form,
      }, authHeader())
      onSent()
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Invite {target.display_name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={form.proposed_date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => set('proposed_date', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="time"
                value={form.proposed_time_start}
                onChange={e => set('proposed_time_start', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="time"
                value={form.proposed_time_end}
                onChange={e => set('proposed_time_end', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Venue (optional)</label>
            <input
              value={form.proposed_venue_name}
              onChange={e => set('proposed_venue_name', e.target.value)}
              placeholder="Where do you want to play?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message (optional)</label>
            <textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              rows={2}
              placeholder="Say something nice…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm"
          >
            {sending ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Matchmaking() {
  const { user, authHeader } = useAuth()

  const [tab, setTab] = useState('find') // 'find' | 'my' | 'inbox' | 'sent'

  // Find players / availability
  const [openSlots, setOpenSlots] = useState(null)
  const [players, setPlayers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // My availability
  const [mySlots, setMySlots] = useState(null)
  const [myLoading, setMyLoading] = useState(false)

  // Invitations
  const [inbox, setInbox] = useState(null)
  const [sent, setSent] = useState(null)
  const [invLoading, setInvLoading] = useState(false)

  // Invite modal
  const [inviteTarget, setInviteTarget] = useState(null)

  // Profile
  const [profile, setProfile] = useState(null)

  const headers = useCallback(() => authHeader(), [authHeader])

  useEffect(() => {
    matchmakingAPI.getProfile(headers()).then(setProfile).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'find') loadFind()
    else if (tab === 'my') loadMy()
    else if (tab === 'inbox') loadInbox()
    else if (tab === 'sent') loadSent()
  }, [tab])

  async function loadFind() {
    setLoading(true)
    setError(null)
    try {
      const [slots, allPlayers] = await Promise.all([
        matchmakingAPI.getAvailability({}, headers()),
        matchmakingAPI.getPlayers({}, headers()),
      ])
      setOpenSlots(slots)
      setPlayers(allPlayers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMy() {
    setMyLoading(true)
    try {
      const data = await matchmakingAPI.getMyAvailability(headers())
      setMySlots(data)
    } catch (_) {}
    setMyLoading(false)
  }

  async function loadInbox() {
    setInvLoading(true)
    try {
      const data = await matchmakingAPI.getInvitations(headers())
      setInbox(data)
    } catch (_) {}
    setInvLoading(false)
  }

  async function loadSent() {
    setInvLoading(true)
    try {
      const data = await matchmakingAPI.getSentInvitations(headers())
      setSent(data)
    } catch (_) {}
    setInvLoading(false)
  }

  async function respondToInvitation(id, status) {
    try {
      await matchmakingAPI.respondInvitation(id, status, headers())
      setInbox(inbox.filter(i => i.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  async function cancelMySlot(slotId) {
    try {
      await matchmakingAPI.cancelAvailability(slotId, headers())
      setMySlots(mySlots.filter(s => s.id !== slotId))
    } catch (err) {
      alert(err.message)
    }
  }

  async function cancelInvitation(id) {
    try {
      await matchmakingAPI.cancelInvitation(id, headers())
      setSent(sent.filter(i => i.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  const TABS = [
    { id: 'find', label: 'Find a game' },
    { id: 'my', label: 'My availability' },
    { id: 'inbox', label: 'Invitations' + (inbox?.length ? ` (${inbox.length})` : '') },
    { id: 'sent', label: 'Sent' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matchmaking</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profile ? `Hello, ${profile.display_name}` : 'Find your next padel partner'}
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <SkillBadge level={profile.skill_level} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1 -mb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── FIND A GAME ── */}
      {tab === 'find' && (
        <div className="space-y-6">
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Open availability from other players */}
          {openSlots?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Players looking for a game
              </h2>
              <div className="space-y-3">
                {openSlots.map(slot => (
                  <div key={slot.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-gray-900">{slot.display_name}</span>
                        <SkillBadge level={slot.skill_level} />
                      </div>
                      <p className="text-xs text-gray-500">
                        {fmtDate(slot.date)} · {slot.time_start.slice(0, 5)}–{slot.time_end.slice(0, 5)}
                        {slot.venue_name && ` · ${slot.venue_name}`}
                      </p>
                      {slot.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{slot.notes}</p>}
                    </div>
                    <button
                      onClick={() => setInviteTarget({ ...slot, id: slot.user_id, display_name: slot.display_name })}
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All players */}
          {players?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">All players</h2>
              <div className="space-y-2">
                {players.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                        {p.display_name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.display_name}</p>
                        {p.preferred_location_name && (
                          <p className="text-xs text-gray-400">📍 {p.preferred_location_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SkillBadge level={p.skill_level} />
                      <button
                        onClick={() => setInviteTarget(p)}
                        className="text-xs border border-green-300 text-green-700 hover:bg-green-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && openSlots?.length === 0 && players?.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🎾</p>
              <p className="text-sm">No other players yet. Be the first to post your availability!</p>
            </div>
          )}
        </div>
      )}

      {/* ── MY AVAILABILITY ── */}
      {tab === 'my' && (
        <div className="space-y-5">
          <PostAvailabilityForm onPosted={loadMy} />

          {myLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {mySlots && mySlots.length === 0 && !myLoading && (
            <p className="text-sm text-gray-400">You have no upcoming availability posted.</p>
          )}
          {mySlots?.map(slot => (
            <div key={slot.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {fmtDate(slot.date)} · {slot.time_start.slice(0, 5)}–{slot.time_end.slice(0, 5)}
                </p>
                {slot.venue_name && <p className="text-xs text-gray-500 mt-0.5">📍 {slot.venue_name}</p>}
                {slot.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{slot.notes}</p>}
                <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full border ${
                  slot.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' :
                  slot.status === 'matched' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>{slot.status}</span>
              </div>
              {slot.status === 'open' && (
                <button
                  onClick={() => cancelMySlot(slot.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 border border-red-200 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── INBOX ── */}
      {tab === 'inbox' && (
        <div className="space-y-3">
          {invLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {inbox?.length === 0 && !invLoading && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">📬</p>
              <p className="text-sm">No pending invitations</p>
            </div>
          )}
          {inbox?.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                  {inv.requester_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.requester_name}</p>
                  <SkillBadge level={inv.requester_skill} />
                </div>
              </div>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                <p>📅 {fmtDate(inv.proposed_date)} · {inv.proposed_time_start?.slice(0,5)}–{inv.proposed_time_end?.slice(0,5)}</p>
                {inv.proposed_venue_name && <p>📍 {inv.proposed_venue_name}</p>}
                {inv.message && <p className="italic text-gray-500">"{inv.message}"</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToInvitation(inv.id, 'accepted')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToInvitation(inv.id, 'declined')}
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg"
                >
                  Decline
                </button>
              </div>
              {inv.proposed_venue_id && (
                <a
                  href={`https://app.playtomic.io/?sport=PADEL&tenantId=${inv.proposed_venue_id}&date=${inv.proposed_date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-green-600 hover:underline"
                >
                  View on Playtomic →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SENT ── */}
      {tab === 'sent' && (
        <div className="space-y-3">
          {invLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {sent?.length === 0 && !invLoading && (
            <p className="text-sm text-gray-400 text-center py-8">No sent invitations yet.</p>
          )}
          {sent?.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">To: {inv.invitee_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmtDate(inv.proposed_date)} · {inv.proposed_time_start?.slice(0,5)}–{inv.proposed_time_end?.slice(0,5)}
                  {inv.proposed_venue_name && ` · ${inv.proposed_venue_name}`}
                </p>
                <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full border ${
                  inv.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  inv.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                  inv.status === 'declined' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>{inv.status}</span>
              </div>
              {inv.status === 'pending' && (
                <button
                  onClick={() => cancelInvitation(inv.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 border border-red-200 rounded-lg"
                >
                  Cancel
                </button>
              )}
              {inv.status === 'accepted' && inv.proposed_venue_id && (
                <a
                  href={`https://app.playtomic.io/?sport=PADEL&tenantId=${inv.proposed_venue_id}&date=${inv.proposed_date}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline shrink-0"
                >
                  Book court →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {inviteTarget && (
        <InviteModal
          target={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onSent={() => {
            setInviteTarget(null)
            setTab('sent')
            setSent(null)
            loadSent()
          }}
        />
      )}
    </div>
  )
}
