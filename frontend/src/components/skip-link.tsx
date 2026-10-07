type SkipLinkProps = {
  /** Id of the main landmark to reach (the application uses main-content). */
  targetId?: string;
};

export function SkipLink({ targetId = "main-content" }: SkipLinkProps) {
  return (
    <a
      className="bg-primary text-primary-foreground fixed top-3 left-3 z-[100] -translate-y-20 rounded-md px-4 py-2 text-sm font-semibold shadow-lg transition-transform focus:translate-y-0"
      href={`#${targetId}`}
    >
      Aller au contenu principal
    </a>
  );
}
