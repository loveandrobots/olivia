import type { ReactNode } from 'react';
import { Plus } from '@phosphor-icons/react';

type AddReminderButtonProps = {
  label?: string;
  icon?: ReactNode;
  prominent?: boolean;
  onClick?: () => void;
};

export function AddReminderButton({
  label = 'Add a reminder…',
  icon = <Plus size={20} />,
  prominent = false,
  onClick,
}: AddReminderButtonProps) {
  return (
    <button
      type="button"
      className={`add-rem-btn${prominent ? ' add-rem-btn-prominent' : ''}`}
      onClick={onClick}
    >
      <div className="add-icon">{icon}</div>
      <span className="add-label">{label}</span>
    </button>
  );
}
