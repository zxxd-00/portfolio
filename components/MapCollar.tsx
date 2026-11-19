const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Map collar: centered title block and contact links. */
export function MapCollar() {
  const now = new Date();
  const revised = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <footer className="mt-24 border-t-2 border-ink/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 text-center sm:px-8">
        <p className="font-display text-3xl tracking-[0.08em] text-forest uppercase">Zaid Adassi</p>
        <p className="mt-1 text-ink-soft">Mechanical engineering, University of California, Berkeley</p>
        <ul className="mt-5 flex flex-col items-center gap-x-8 gap-y-1 sm:flex-row">
          <li>
            <a className="link" href="mailto:zaid_adassi@berkeley.edu">zaid_adassi@berkeley.edu</a>
          </li>
          <li>
            <a className="link" href="https://linkedin.com/in/zaid-adassi" target="_blank" rel="noreferrer">linkedin.com/in/zaid-adassi</a>
          </li>
        </ul>

      </div>
      <div className="border-t border-ink/15">
        <p className="meta mx-auto max-w-6xl px-4 py-4 pb-20 text-center text-ink-soft sm:px-8 lg:pb-4">
          Surveyed and drawn by Zaid Adassi. Revised {revised}.
        </p>
      </div>
    </footer>
  );
}
