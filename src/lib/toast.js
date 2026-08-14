import { toast } from 'sonner';

// Reemplaza window.confirm() (bloquea la pestaña entera, no se puede
// estilizar, se ve como del sistema operativo) por un toast con acción —
// no bloqueante, onConfirm corre recién si el usuario toca el botón.
export function confirmToast(message, onConfirm, { confirmLabel = 'Confirmar', description } = {}) {
  toast(message, {
    description,
    action: { label: confirmLabel, onClick: onConfirm },
    cancel: { label: 'Cancelar' },
    duration: 10000
  });
}

export { toast };
