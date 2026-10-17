import { ConnectorSyncResult } from '../types';

export interface GoogleCalendarConfig {
  calendarId?: string;
  syncFocusBlocks?: boolean;
  syncSpacedRepetition?: boolean;
  reminderMinutes?: number;
}

export async function syncToGoogleCalendar(
  _config: GoogleCalendarConfig = {}
): Promise<ConnectorSyncResult> {
  return {
    connectorType: 'google_calendar',
    success: false,
    syncedCount: 0,
    message: 'Google Calendar OAuth synchronization is not implemented. No events were sent.',
    syncedAt: new Date().toISOString()
  };
}
