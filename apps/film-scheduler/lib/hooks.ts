import { useState } from "react"

export function useToggle (defaultValue = false) {
  const [open, setOpen] = useState(defaultValue)
  const toggle = () => setOpen(o => !o)

  return {
    open,
    setOpen,
    toggle
  }
}
