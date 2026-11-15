// The context of the Toast: the functions of useToast(). The ToastProvider gives them to the components inside it.
import { createContext } from 'react'
import type { ToastApi } from './toast.types'

/** The functions of the nearest ToastProvider. With no provider, the value is null. */
export const ToastContext = createContext<ToastApi | null>(null)
