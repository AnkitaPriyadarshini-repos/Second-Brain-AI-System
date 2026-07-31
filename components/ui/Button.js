const React = require('react');

/**
 * Reusable Button Component
 */
function Button({ children, onClick, type = 'button', variant = 'primary', style = {}, disabled = false }) {
  const isPrimary = variant === 'primary';
  return React.createElement(
    'button',
    {
      type,
      onClick,
      disabled,
      className: isPrimary ? 'ws-send-btn' : 'ws-room-pill',
      style
    },
    children
  );
}

module.exports = Button;
module.exports.default = Button;
