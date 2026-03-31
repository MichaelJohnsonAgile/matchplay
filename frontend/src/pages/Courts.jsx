import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { courtsAPI } from '../services/api'

const SKILL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', pro: 'Pro' }

// Format a Playtomic slot start time (ISO string → HH:MM)
function fmtTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Duration from start + duration_minutes
function fmtDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`
}

export default function Courts() {
  const { authHeader } = useAuth()

  // Venue search state
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [venues, setVenues] = useState(null)
  const [venuesLoading, setVenuesLoading] = useState(false)
  const [venuesError, setVenuesError] = useState(null)

  // Availability state
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [slots, setSlots] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(null)

  function detectLocation() {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setGeoLoading(false)
      },
      () => setGeoLoading(false)
    )
  }

  async function searchVenues(e) {
    e.preventDefault()
    if (!lat || !lng) return
    setVenuesLoading(true)
    setVenuesError(null)
    setVenues(null)
    setSelectedVenue(null)
    setSlots(null)
    try {
      const data = await courtsAPI.getVenues({ lat, lng })
      setVenues(data)
    } catch (err) {
      setVenuesError(err.message)
    } finally {
      setVenuesLoading(false)
    }
  }

  async function loadAvailability(venue) {
    setSelectedVenue(venue)
    setSlots(null)
    setSlotsError(null)
    setSlotsLoading(true)
    try {
      const data = await courtsAPI.getAvailability({ tenantId: venue.tenant_id, date })
      setSlots(data)
    } catch (err) {
      setSlotsError(err.message)
    } finally {
      setSlotsLoading(false)
    }
  }

  function openBooking(slot) {
    const params = new URLSearchParams({
      sport: 'PADEL',
      tenantId: selectedVenue.tenant_id,
      date,
    })
    if (slot?.start_time) params.set('startTime', slot.start_time)
    const url = `https://app.playtomic.io/?${params}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Court</h1>
        <p className="text-gray-500 text-sm mt-1">Search padel courts near you powered by Playtomic</p>
      </div>

      {/* Location / search form */}
      <form onSubmit={searchVenues} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
            <input
              value={lat}
              onChange={e => setLat(e.target.value)}
              placeholder="51.5074"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
            <input
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="-0.1278"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="button"
            onClick={detectLocation}
            disabled={geoLoading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            {geoLoading ? '…' : '📍 Use my location'}
          </button>
        </div>
        <button
          type="submit"
          disabled={venuesLoading || !lat || !lng}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          {venuesLoading ? 'Searching…' : 'Search courts'}
        </button>
      </form>

      {venuesError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{venuesError}</p>
      )}

      {/* Venue list */}
      {venues && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {venues.length} venue{venues.length !== 1 ? 's' : ''} nearby
          </h2>
          {venues.length === 0 && (
            <p className="text-gray-400 text-sm">No padel courts found in this area. Try increasing the radius.</p>
          )}
          {venues.map(v => (
            <div
              key={v.tenant_id}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                selectedVenue?.tenant_id === v.tenant_id
                  ? 'border-green-500 ring-1 ring-green-300'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{v.tenant_name}</h3>
                  {v.address?.full_address && (
                    <p className="text-xs text-gray-500 mt-0.5">{v.address.full_address}</p>
                  )}
                  {v.properties?.number_of_courts && (
                    <p className="text-xs text-gray-400 mt-0.5">{v.properties.number_of_courts} courts</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setDate(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <button
                    onClick={() => loadAvailability(v)}
                    className="self-end bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Check slots
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Availability slots */}
      {selectedVenue && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Available slots — {selectedVenue.tenant_name}
            </h2>
            <span className="text-xs text-gray-400">{date}</span>
          </div>

          {slotsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
              Loading availability…
            </div>
          )}

          {slotsError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{slotsError}</p>
          )}

          {slots && !slotsLoading && (
            <>
              {slots.length === 0 ? (
                <p className="text-gray-400 text-sm">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => openBooking(slot)}
                      className="bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-3 text-left transition-all group"
                    >
                      <p className="text-base font-semibold text-gray-900">{fmtTime(slot.start_time)}</p>
                      {slot.duration && (
                        <p className="text-xs text-gray-500">{fmtDuration(slot.duration)}</p>
                      )}
                      {slot.resource_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{slot.resource_name}</p>
                      )}
                      {slot.price && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                          {typeof slot.price === 'object'
                            ? `${slot.price.amount} ${slot.price.currency}`
                            : slot.price}
                        </p>
                      )}
                      <p className="text-xs text-green-700 group-hover:text-green-800 mt-2 font-medium">
                        Book on Playtomic →
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center pt-2">
                Clicking a slot opens Playtomic to complete your booking.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
