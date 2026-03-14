type AddReminderButtonProps = {
  label?: string;
  icon?: string;
  prominent?: boolean;
  onClick?: () => void;
};

export function AddReminderButton({
  label = 'Add a reminder…',
  icon = '🔔',
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
