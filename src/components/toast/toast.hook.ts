// The hook of the Toast: the functions that add, update, and close a toast (contract: ir/contracts/toast.json).
import { useContext } from 'react'
import { ToastContext } from './toast.context'
import type { ToastApi } from './toast.types'

/**
 * The functions of the nearest ToastProvider: add, update, and close. Each function stays the same between renders.
 * Use a toast only for a result that the user cannot see on the screen (toast/use).
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast: put the component in a ToastProvider.')
  return api
}
