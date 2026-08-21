import type { Notification } from '../types/notification'

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    recipientUserId: 'usr-field-responder-2', // Diego Fuentes
    type: 'MISSION_DISPATCH',
    channel: 'SMS',
    message: 'New mission dispatched: CRITICAL incident near your area. Reply to accept or decline.',
    missionId: 'mission-1',
    sentAt: '2026-08-20T14:02:00Z',
    read: true,
    readAt: '2026-08-20T14:03:00Z',
  },
  {
    id: 'notif-2',
    recipientUserId: 'usr-field-responder-1', // Casey Nolan
    type: 'MISSION_REASSIGNED',
    channel: 'SMS',
    message: 'Mission reassigned to you after another responder declined: CRITICAL incident. Reply to accept or decline.',
    missionId: 'mission-2',
    sentAt: '2026-08-20T14:04:00Z',
    read: true,
    readAt: '2026-08-20T14:04:30Z',
  },
  {
    id: 'notif-3',
    recipientUserId: 'usr-field-responder-3', // Harper Lin
    type: 'MISSION_DISPATCH',
    channel: 'SMS',
    message: 'New mission dispatched: HIGH priority flood rescue. Reply to accept or decline.',
    missionId: 'mission-3',
    sentAt: '2026-08-20T13:46:00Z',
    read: true,
    readAt: '2026-08-20T13:46:40Z',
  },
  {
    id: 'notif-4',
    recipientUserId: 'usr-field-responder-4', // Sam Okafor
    type: 'MISSION_DISPATCH',
    channel: 'SMS',
    message: 'New mission dispatched: MEDIUM priority structural assessment. Reply to accept or decline.',
    missionId: 'mission-4',
    sentAt: '2026-08-20T14:11:00Z',
    read: false,
  },
  {
    id: 'notif-5',
    recipientUserId: 'usr-field-responder-5', // Robin Kessler
    type: 'MISSION_DISPATCH',
    channel: 'SMS',
    message: 'New mission dispatched: LOW priority damage report. Reply to accept or decline.',
    missionId: 'mission-5',
    sentAt: '2026-08-20T10:14:00Z',
    read: true,
    readAt: '2026-08-20T10:15:00Z',
  },
  {
    id: 'notif-6',
    recipientUserId: 'usr-command-staff-1', // Morgan Reyes
    type: 'MISSION_COMPLETED',
    channel: 'IN_APP',
    message: 'Mission completed by Casey Nolan for incident-6.',
    missionId: 'mission-6',
    sentAt: '2026-08-19T18:05:00Z',
    read: true,
    readAt: '2026-08-19T18:10:00Z',
  },
  {
    id: 'notif-7',
    recipientUserId: 'usr-agency-admin-1', // Jordan Blake
    type: 'SYSTEM',
    channel: 'IN_APP',
    message: 'Field responder account for Sam Okafor was created.',
    sentAt: '2026-01-15T09:00:00Z',
    read: false,
  },
  {
    id: 'notif-8',
    recipientUserId: 'usr-system-admin-1', // Alex Rivera
    type: 'SYSTEM',
    channel: 'IN_APP',
    message: 'New agency registration awaiting review: Coastal Emergency Response.',
    sentAt: '2026-08-18T11:15:00Z',
    read: false,
  },
  {
    id: 'notif-9',
    recipientUserId: 'usr-command-staff-1', // Morgan Reyes
    type: 'DETECTION_PENDING_REVIEW',
    channel: 'IN_APP',
    message: 'New AI detection requires review: casualty detected by Sentinel-3 (live feed).',
    sentAt: '2026-08-20T14:15:00Z',
    read: false,
  },
  {
    id: 'notif-10',
    recipientUserId: 'usr-command-staff-2', // Taylor Brooks
    type: 'DETECTION_VERIFIED',
    channel: 'IN_APP',
    message: 'Detection det-1 was verified by Morgan Reyes.',
    sentAt: '2026-08-20T14:01:00Z',
    read: true,
    readAt: '2026-08-20T14:05:00Z',
  },
  {
    id: 'notif-11',
    recipientUserId: 'usr-command-staff-2', // Taylor Brooks
    type: 'INCIDENT_CREATED',
    channel: 'IN_APP',
    message: 'Incident incident-1 created from a verified casualty detection.',
    sentAt: '2026-08-20T14:01:00Z',
    read: true,
    readAt: '2026-08-20T14:05:00Z',
  },
  {
    id: 'notif-12',
    recipientUserId: 'usr-command-staff-1', // Morgan Reyes
    type: 'RESPONDER_ON_SITE',
    channel: 'IN_APP',
    message: 'Harper Lin has arrived on-site for incident-2.',
    missionId: 'mission-3',
    sentAt: '2026-08-20T14:02:00Z',
    read: false,
  },
  {
    id: 'notif-13',
    recipientUserId: 'usr-command-staff-1', // Morgan Reyes
    type: 'MISSION_STATUS_CHANGED',
    channel: 'IN_APP',
    message: 'Casey Nolan accepted the mission for incident-1.',
    missionId: 'mission-2',
    sentAt: '2026-08-20T14:04:45Z',
    read: true,
    readAt: '2026-08-20T14:05:10Z',
  },
]
