'use client';

import { useState, useTransition } from 'react';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@/lib/crm/sla';
import { changeAppointmentStatus } from './actions';
import admin from '../../admin.module.css';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-Show',
  rescheduled: 'Rescheduled',
};

export default function AppointmentStatusSelect({ id, status }: { id: string; status: AppointmentStatus }) {
  const [val, setVal] = useState<AppointmentStatus>(status);
  const [pending, start] = useTransition();

  return (
    <select
      aria-label="Appointment status"
      className={admin.select}
      value={val}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as AppointmentStatus;
        setVal(next);
        start(async () => {
          const res = await changeAppointmentStatus(id, next);
          if (!res.ok) setVal(status);
        });
      }}
    >
      {APPOINTMENT_STATUSES.map((st) => (
        <option key={st} value={st}>{STATUS_LABEL[st]}</option>
      ))}
    </select>
  );
}
