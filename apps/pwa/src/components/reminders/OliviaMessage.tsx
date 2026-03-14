type OliviaMessageProps = {
  label?: string;
  text: string;
};

export function OliviaMessage({ label = '✦ Olivia', text }: OliviaMessageProps) {
  return (
    <div className="omsg">
      <div className="omsg-label">{label}</div>
      <div className="omsg-text">"{text}"</div>
    </div>
  );
}
