import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

// Simple utility function for combining class names
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface ToggleThemeProps extends Omit<React.ComponentPropsWithoutRef<"button">, 'onToggle'> {
  onToggle?: (isDark: boolean) => void
}

export const ToggleTheme = ({
  className,
  onToggle,
  ...props
}: ToggleThemeProps) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }
    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    // Apply theme change
    if (newTheme) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    
    localStorage.setItem("theme", newTheme ? "dark" : "light")
    onToggle?.(newTheme)
  }, [isDark, onToggle])

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-full transition-all duration-300 hover:scale-110",
        isDark 
          ? "hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
          : "hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20",
        className
      )}
      {...props}
    >
      {isDark ? (
        <Sun className="h-6 w-6 text-amber-500" />
      ) : (
        <Moon className="h-6 w-6 text-blue-500" />
      )}
    </button>
  )
}