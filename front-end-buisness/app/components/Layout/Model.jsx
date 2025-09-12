import React from "react";

const Modal = ({ isOpen, onClose, onConfirm, children, isConfirm, isCancel }) => {
  if (!isOpen) return null;

  const handleBackgroundClick = (e) => {
    // Only trigger onClose if the click is on the background (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="mb-6">{children}</div>
        <div className="flex justify-end space-x-4">
          {isCancel && <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 p-2 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>}
        {isConfirm &&  <button
            onClick={onConfirm}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
          >
            Confirm
          </button>}
        </div>
      </div>
    </div>
  );
};

export default Modal;