function Toast({ show, message, type, onClose }) {
  return (
    <div
      className={`toast align-items-center text-bg-${type} border-0 position-fixed bottom-0 end-0 m-3 ${show ? "show" : "hide"}`}
      role="alert"
    >
      <div className="d-flex">
        <div className="toast-body">{message}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          onClick={onClose}
        ></button>
      </div>
    </div>
  );
}

export default Toast;
