const React = require('react');

/**
 * Reusable ChatInput Component
 */
function ChatInput({ value, onChange, onSubmit, placeholder = 'Type a message...' }) {
  return React.createElement(
    'form',
    { className: 'ws-input-form', onSubmit },
    React.createElement('input', {
      type: 'text',
      className: 'ws-input-field',
      placeholder,
      value,
      onChange: (e) => onChange(e.target.value)
    }),
    React.createElement('button', { type: 'submit', className: 'ws-send-btn' }, 'Send ⚡')
  );
}

module.exports = ChatInput;
module.exports.default = ChatInput;
