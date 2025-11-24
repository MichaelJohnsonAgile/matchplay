import Modal from './Modal'

export function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        {getIcon()}
        {title && <h3 className="text-xl font-semibold mb-2">{title}</h3>}
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <button 
          onClick={onClose}
          className="w-full bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2a5f3c]"
        >
          OK
        </button>
      </div>
    </Modal>
  )
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'black' }) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const confirmButtonClass = confirmColor === 'red' 
    ? 'flex-1 bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700'
    : 'flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium hover:bg-[#2a5f3c]'

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        {title && <h3 className="text-xl font-semibold mb-3 text-center">{title}</h3>}
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className={confirmButtonClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

