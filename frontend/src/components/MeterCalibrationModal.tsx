/**
 * MeterCalibrationModal.tsx
 * Modal för att mata in manuell elmätaravläsning och utföra kalibrering
 */

'use client';

import { useState } from 'react';

interface MeterCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrate: (value: number, dateTime: string) => Promise<void>;
}

export default function MeterCalibrationModal({
  isOpen,
  onClose,
  onCalibrate,
}: MeterCalibrationModalProps) {
  const [meterValue, setMeterValue] = useState('');
  const [calibrationDate, setCalibrationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [calibrationTime, setCalibrationTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meterValue || !calibrationDate || !calibrationTime) {
      setFeedback({
        type: 'error',
        message: 'Alla fält är obligatoriska',
      });
      return;
    }

    const value = parseFloat(meterValue);
    if (isNaN(value) || value < 0) {
      setFeedback({
        type: 'error',
        message: 'Ogiltigt mätarvärde',
      });
      return;
    }

    const dateTime = `${calibrationDate}T${calibrationTime}:00Z`;

    setIsLoading(true);
    setFeedback(null);

    try {
      await onCalibrate(value, dateTime);
      setFeedback({
        type: 'success',
        message: 'Kalibrering genomförd! Mätarvärden uppdaterade.',
      });
      setMeterValue('');
      setCalibrationDate(new Date().toISOString().split('T')[0]);
      setCalibrationTime(new Date().toTimeString().slice(0, 5));

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Kalibrering misslyckades',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Mätardata
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ställ in den totala mätarställningen från din elmätartavla för att
          kalibrera systemet. Alla historiska värden räknas om automatiskt.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mätarställning Input */}
          <div>
            <label
              htmlFor="meterValue"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Manuell mätarställning (kWh)
            </label>
            <input
              id="meterValue"
              type="number"
              step="0.01"
              value={meterValue}
              onChange={(e) => setMeterValue(e.target.value)}
              placeholder="T.ex. 64161.21"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Läs värdet direkt från elmätaren
            </p>
          </div>

          {/* Datum Input */}
          <div>
            <label
              htmlFor="calibrationDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Datum
            </label>
            <input
              id="calibrationDate"
              type="date"
              value={calibrationDate}
              onChange={(e) => setCalibrationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tid Input */}
          <div>
            <label
              htmlFor="calibrationTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tid
            </label>
            <input
              id="calibrationTime"
              type="time"
              value={calibrationTime}
              onChange={(e) => setCalibrationTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-3 rounded-md text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}
            >
              {feedback.type === 'success' ? '✓ ' : '✗ '}
              {feedback.message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700
                         hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md
                         disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md
                         disabled:opacity-50 disabled:cursor-not-allowed transition
                         font-medium"
            >
              {isLoading ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          💡 <strong>Tip:</strong> Systemet räknar retroaktivt framåt och bakåt
          från denna tidspunkten för att uppdatera alla mätarvärden.
        </p>
      </div>
    </div>
  );
}
