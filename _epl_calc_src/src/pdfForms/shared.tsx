export function Val({ children, wide }: { children?: React.ReactNode; wide?: boolean }) {
  return (
    <span className={`pl-val${wide ? ' pl-val--wide' : ''}`}>
      {children != null && children !== '' ? children : '\u00A0'}
    </span>
  );
}
