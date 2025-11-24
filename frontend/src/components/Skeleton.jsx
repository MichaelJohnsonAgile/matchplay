export function SkeletonText({ className = '' }) {
  return <div className={`skeleton h-4 ${className}`}></div>
}

export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-px ${className}`}></div>
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-3 text-left">
                <SkeletonText className="w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <SkeletonText className="w-12" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton h-24 ${className}`}></div>
  )
}

// Default export for generic skeleton
export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`}></div>
}

