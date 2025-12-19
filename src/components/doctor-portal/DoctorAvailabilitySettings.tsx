import { useState } from 'react';
import { useDoctorAvailability } from '../../hooks/useDoctorAvailability';
import { useBlockedSlots } from '../../hooks/useBlockedSlots';
import type { DoctorAvailability, CreateAvailabilityInput, CreateBlockedSlotInput } from '../../types/database';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

// Day group presets for quick selection
const DAY_PRESETS = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
  { label: 'All Days', days: [0, 1, 2, 3, 4, 5, 6] },
];

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const display = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  return { value: time, label: display };
});

interface Props {
  onClose: () => void;
}

type TabType = 'weekly' | 'blocked';

export function DoctorAvailabilitySettings({ onClose }: Props) {
  const { availability, loading, error, createAvailability, deleteAvailability } = useDoctorAvailability();
  const { blockedSlots, loading: loadingBlocked, error: errorBlocked, createBlockedSlot, deleteBlockedSlot } = useBlockedSlots();

  const [activeTab, setActiveTab] = useState<TabType>('weekly');
  const [isAddingBlocked, setIsAddingBlocked] = useState(false);

  // Multi-day selection state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default to weekdays
  const [newSlotTimes, setNewSlotTimes] = useState({
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 15
  });

  const [newBlockedSlot, setNewBlockedSlot] = useState<CreateBlockedSlotInput>({
    blocked_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    reason: '',
    is_all_day: false
  });

  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const applyPreset = (days: number[]) => {
    setSelectedDays([...days]);
  };

  const handleAddSlot = async () => {
    if (selectedDays.length === 0) {
      return; // No days selected
    }

    setSaving(true);
    let successCount = 0;

    // Create availability for each selected day
    for (const day of selectedDays) {
      const slotInput: CreateAvailabilityInput = {
        day_of_week: day,
        start_time: newSlotTimes.start_time,
        end_time: newSlotTimes.end_time,
        slot_duration_minutes: newSlotTimes.slot_duration_minutes
      };
      const result = await createAvailability(slotInput);
      if (result) successCount++;
    }

    setSaving(false);
    if (successCount > 0) {
      setSelectedDays([1, 2, 3, 4, 5]); // Reset to weekdays
      setNewSlotTimes({
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 15
      });
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      await deleteAvailability(id);
    }
  };

  const handleAddBlockedSlot = async () => {
    setSaving(true);
    const result = await createBlockedSlot(newBlockedSlot);
    setSaving(false);
    if (result) {
      setIsAddingBlocked(false);
      setNewBlockedSlot({
        blocked_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        reason: '',
        is_all_day: false
      });
    }
  };

  const handleDeleteBlockedSlot = async (id: string) => {
    if (confirm('Are you sure you want to delete this blocked time?')) {
      await deleteBlockedSlot(id);
    }
  };

  const groupedByDay = availability.reduce((acc, slot) => {
    const day = slot.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, DoctorAvailability[]>);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Group blocked slots by upcoming vs past
  const today = new Date().toISOString().split('T')[0];
  const upcomingBlockedSlots = blockedSlots.filter(slot => slot.blocked_date >= today);
  const pastBlockedSlots = blockedSlots.filter(slot => slot.blocked_date < today);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-aneya-navy text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Availability Settings</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'weekly'
                ? 'text-aneya-teal border-b-2 border-aneya-teal bg-aneya-teal/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'blocked'
                ? 'text-aneya-teal border-b-2 border-aneya-teal bg-aneya-teal/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Blocked Times
            {upcomingBlockedSlots.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {upcomingBlockedSlots.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'weekly' ? (
            /* Weekly Schedule Tab */
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add Availability Form - Always visible */}
                  <div className="border border-aneya-teal/30 bg-aneya-teal/5 rounded-lg p-4">
                    <h4 className="font-medium text-aneya-navy mb-3">Add Availability</h4>

                    {/* Day Selection */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-600 mb-2">Select Days</label>

                      {/* Preset buttons */}
                      <div className="flex gap-2 mb-3">
                        {DAY_PRESETS.map(preset => {
                          const isActive = preset.days.length === selectedDays.length &&
                            preset.days.every(d => selectedDays.includes(d));
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => applyPreset(preset.days)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                isActive
                                  ? 'bg-aneya-teal text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Individual day checkboxes */}
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <label
                            key={day.value}
                            className={`inline-flex items-center px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedDays.includes(day.value)
                                ? 'bg-aneya-teal/10 border-aneya-teal text-aneya-teal'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDays.includes(day.value)}
                              onChange={() => toggleDay(day.value)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium">{day.short}</span>
                          </label>
                        ))}
                      </div>
                      {selectedDays.length === 0 && (
                        <p className="text-xs text-red-500 mt-2">Please select at least one day</p>
                      )}
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                        <select
                          value={newSlotTimes.start_time}
                          onChange={e => setNewSlotTimes(prev => ({ ...prev, start_time: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {TIME_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">End Time</label>
                        <select
                          value={newSlotTimes.end_time}
                          onChange={e => setNewSlotTimes(prev => ({ ...prev, end_time: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {TIME_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Slot Duration</label>
                        <select
                          value={newSlotTimes.slot_duration_minutes}
                          onChange={e => setNewSlotTimes(prev => ({ ...prev, slot_duration_minutes: Number(e.target.value) }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value={15}>15 minutes</option>
                          <option value={20}>20 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={60}>60 minutes</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    {selectedDays.length > 0 && (
                      <div className="mt-4 bg-white rounded-lg p-3 border border-aneya-teal/20">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Will add availability for:</span>{' '}
                          {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ')}{' '}
                          from {formatTime(newSlotTimes.start_time)} to {formatTime(newSlotTimes.end_time)}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleAddSlot}
                        disabled={saving || selectedDays.length === 0}
                        className="px-4 py-2 text-sm bg-aneya-teal text-white rounded-lg hover:bg-aneya-teal/90 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : `Add to ${selectedDays.length} Day${selectedDays.length !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>

                  {/* Existing Availability - Show below the form */}
                  {availability.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-aneya-navy mb-3">Current Availability</h4>
                      <div className="space-y-2">
                        {DAYS_OF_WEEK.filter(day => groupedByDay[day.value]?.length > 0).map(day => (
                          <div key={day.value} className="bg-gray-50 rounded-lg p-3">
                            <h5 className="font-medium text-aneya-navy text-sm mb-2">{day.label}</h5>
                            <div className="space-y-1">
                              {groupedByDay[day.value].map(slot => (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                    <span className="text-gray-500 ml-2">
                                      ({slot.slot_duration_minutes} min)
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Blocked Times Tab */
            <>
              {errorBlocked && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {errorBlocked}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Block specific dates and times when you're unavailable (holidays, personal appointments, etc.)
              </p>

              {loadingBlocked ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aneya-teal"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Upcoming Blocked Slots */}
                  {upcomingBlockedSlots.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h3 className="font-medium text-aneya-navy text-sm">Upcoming Blocked Times</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {upcomingBlockedSlots.map(slot => (
                          <div key={slot.id} className="p-4 flex items-start justify-between">
                            <div>
                              <p className="font-medium text-aneya-navy">{formatDate(slot.blocked_date)}</p>
                              <p className="text-sm text-gray-600">
                                {slot.is_all_day ? 'All day' : `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                              </p>
                              {slot.reason && (
                                <p className="text-sm text-gray-500 mt-1">{slot.reason}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteBlockedSlot(slot.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Blocked Slots (collapsed) */}
                  {pastBlockedSlots.length > 0 && (
                    <details className="border border-gray-200 rounded-lg overflow-hidden">
                      <summary className="bg-gray-50 px-4 py-2 cursor-pointer text-sm text-gray-600 hover:bg-gray-100">
                        Past blocked times ({pastBlockedSlots.length})
                      </summary>
                      <div className="divide-y divide-gray-100">
                        {pastBlockedSlots.map(slot => (
                          <div key={slot.id} className="p-4 opacity-60">
                            <p className="font-medium text-gray-700">{formatDate(slot.blocked_date)}</p>
                            <p className="text-sm text-gray-500">
                              {slot.is_all_day ? 'All day' : `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                            </p>
                            {slot.reason && (
                              <p className="text-sm text-gray-400 mt-1">{slot.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {blockedSlots.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No blocked times set</p>
                    </div>
                  )}
                </div>
              )}

              {/* Add blocked time form */}
              {isAddingBlocked && (
                <div className="mt-4 border border-red-200 bg-red-50/50 rounded-lg p-4">
                  <h4 className="font-medium text-aneya-navy mb-3">Block Time</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={newBlockedSlot.blocked_date}
                        onChange={e => setNewBlockedSlot(prev => ({ ...prev, blocked_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_all_day"
                        checked={newBlockedSlot.is_all_day}
                        onChange={e => setNewBlockedSlot(prev => ({ ...prev, is_all_day: e.target.checked }))}
                        className="rounded border-gray-300 text-aneya-teal focus:ring-aneya-teal"
                      />
                      <label htmlFor="is_all_day" className="text-sm text-gray-700">Block entire day</label>
                    </div>

                    {!newBlockedSlot.is_all_day && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                          <select
                            value={newBlockedSlot.start_time}
                            onChange={e => setNewBlockedSlot(prev => ({ ...prev, start_time: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">End Time</label>
                          <select
                            value={newBlockedSlot.end_time}
                            onChange={e => setNewBlockedSlot(prev => ({ ...prev, end_time: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
                      <input
                        type="text"
                        value={newBlockedSlot.reason || ''}
                        onChange={e => setNewBlockedSlot(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="e.g., Holiday, Personal appointment"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingBlocked(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddBlockedSlot}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Block Time'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between">
          {activeTab === 'blocked' && !isAddingBlocked && (
            <button
              onClick={() => setIsAddingBlocked(true)}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              + Block Time
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
