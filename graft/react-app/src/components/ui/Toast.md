# react-app/src/components/ui/Toast.tsx

- ToastVariant · type · L6-L6 — type ToastVariant = 'success' | 'error' | 'info' | 'warning'
- Toast · interface · L8-L14 — interface Toast
- ToastContextValue · interface · L16-L18 — interface ToastContextValue
- ToastItem · function · L40-L108 — function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void })
- ToastProvider · function · L112-L183 — function ToastProvider({ children }: { children: React.ReactNode })
- useToast · function · L187-L191 — function useToast(): ToastContextValue
