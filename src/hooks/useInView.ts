import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Stop observing after the first time the element becomes visible. */
  once?: boolean
  rootMargin?: string
  threshold?: number
}

/** Tracks whether an element has scrolled into the viewport, for scroll-triggered reveals. */
export function useInView<T extends HTMLElement>({
  once = true,
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.15,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return { ref, inView }
}
