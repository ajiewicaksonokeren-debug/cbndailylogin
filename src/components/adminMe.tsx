'use client';
import { createContext, useContext } from 'react';

export type Me = { name: string; role: 'admin' | 'marketing' | 'cs'; env: string; serverNow: number; activeEvents: number; demo: boolean };
export const MeCtx = createContext<{ me: Me | null; refresh: () => void }>({ me: null, refresh: () => {} });
export const useMe = () => useContext(MeCtx);
