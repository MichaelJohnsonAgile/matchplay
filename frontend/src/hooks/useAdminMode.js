import { useSearchParams, useNavigate as useRouterNavigate } from 'react-router-dom'

export function useAdminMode() {
  const [searchParams] = useSearchParams()
  return searchParams.get('admin') === 'true'
}

export function useNavigateWithAdmin() {
  const navigate = useRouterNavigate()
  const [searchParams] = useSearchParams()
  const isAdminMode = searchParams.get('admin') === 'true'

  return (path, options) => {
    if (isAdminMode) {
      const separator = path.includes('?') ? '&' : '?'
      navigate(`${path}${separator}admin=true`, options)
    } else {
      navigate(path, options)
    }
  }
}

