import type { ComponentType } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/cn'

interface RoleSelectCardProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  responsibilities: string[]
  selected: boolean
  onSelect: () => void
}

export function RoleSelectCard({ icon: Icon, title, description, responsibilities, selected, onSelect }: RoleSelectCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col items-start gap-3 rounded-lg border-2 px-5 py-5 text-left transition-all motion-safe:duration-200',
        'motion-safe:active:scale-[0.99]',
        selected
          ? 'border-accent bg-accent-subtle shadow-panel'
          : 'border-border-strong bg-surface hover:border-border-strong hover:bg-surface-secondary',
      )}
    >
      {selected ? (
        <span className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-accent text-foreground-inverse motion-safe:animate-pop-in">
          <Check className="size-3.5" />
        </span>
      ) : null}

      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-md transition-colors',
          selected ? 'bg-accent text-foreground-inverse' : 'bg-surface-secondary text-foreground-secondary group-hover:text-foreground',
        )}
      >
        <Icon className="size-6" />
      </span>

      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{description}</p>
      </div>

      <ul className="flex flex-col gap-1.5 border-t border-border/70 pt-3">
        {responsibilities.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-foreground-secondary">
            <span className={cn('mt-1.5 size-1 shrink-0 rounded-full', selected ? 'bg-accent' : 'bg-foreground-muted')} />
            {item}
          </li>
        ))}
      </ul>
    </button>
  )
}
