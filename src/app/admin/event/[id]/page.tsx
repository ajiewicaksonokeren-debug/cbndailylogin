'use client';
import { use } from 'react';
import EventForm from '@/components/EventForm';

export default function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  return <EventForm id={use(params).id} />;
}
