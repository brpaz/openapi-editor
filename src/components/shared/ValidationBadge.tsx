interface ValidationBadgeError {
  message: string;
  severity: "error" | "warning" | "info";
}

interface ValidationBadgeProps {
  errors: ValidationBadgeError[];
  className?: string;
}

const SEVERITY_COLORS: Record<ValidationBadgeError["severity"], string> = {
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

const SEVERITY_ORDER: Record<ValidationBadgeError["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function highestSeverity(
  errors: ValidationBadgeError[],
): ValidationBadgeError["severity"] {
  let best: ValidationBadgeError["severity"] = "info";
  for (const err of errors) {
    if (SEVERITY_ORDER[err.severity] < SEVERITY_ORDER[best]) {
      best = err.severity;
    }
  }
  return best;
}

export default function ValidationBadge({
  errors,
  className,
}: ValidationBadgeProps) {
  if (errors.length === 0) return null;

  const severity = highestSeverity(errors);

  return (
    <span className={`group relative inline-flex ${className ?? ""}`}>
      <span className={`text-xs ${SEVERITY_COLORS[severity]}`}>●</span>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-xs -translate-x-1/2 rounded bg-gray-900 px-2 py-1 shadow-lg group-hover:block dark:bg-gray-100">
        <ul className="space-y-0.5">
          {errors.map((err, i) => (
            <li
              key={i}
              className={`text-xs ${
                err.severity === "error"
                  ? "text-red-300 dark:text-red-600"
                  : err.severity === "warning"
                    ? "text-amber-300 dark:text-amber-600"
                    : "text-blue-300 dark:text-blue-600"
              }`}
            >
              {err.message}
            </li>
          ))}
        </ul>
      </div>
    </span>
  );
}
