import type { ElementType, HTMLAttributes } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface TextEffectProps extends HTMLAttributes<HTMLElement> {
  children: string
  per?: 'word'
  as?: ElementType
  preset?: 'blur'
}

export function TextEffect({ children, per = 'word', as: Tag = 'p', preset = 'blur', ...props }: TextEffectProps) {
  const reducedMotion = useReducedMotion()
  const words = per === 'word' ? children.split(/(\s+)/) : [children]

  return (
    <Tag {...props}>
      {words.map((word, index) => {
        if (/\s+/.test(word)) return word

        return (
          <motion.span
            key={`${word}-${index}`}
            initial={reducedMotion ? false : { opacity: 0, filter: preset === 'blur' ? 'blur(10px)' : undefined }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              delay: reducedMotion ? 0 : index * 0.035,
              ease: 'easeOut',
            }}
          >
            {word}
          </motion.span>
        )
      })}
    </Tag>
  )
}