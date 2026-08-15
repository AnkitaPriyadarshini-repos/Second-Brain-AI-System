const React = require('react');

/**
 * Reusable ChatInput Component
 * Supports multiline composer: Enter = Send, Shift + Enter = New line
 */
function ChatInput({ value, onChange, onSubmit, disabled = false, placeholder = 'Type a message...' }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (typeof onSubmit === 'function') {
        onSubmit(e);
      }
    }
  };

  return React.createElement(
    'form',
    {
      className: 'ws-input-form',
      onSubmit: (e) => {
        e.preventDefault();
        if (typeof onSubmit === 'function') onSubmit(e);
      }
    },
    React.createElement('textarea', {
      className: 'ws-input-field',
      placeholder,
      value,
      disabled,
      rows: 1,
      style: { resize: 'none', minHeight: '42px', fontFamily: 'inherit' },
      onChange: (e) => onChange(e.target.value),
      onKeyDown: handleKeyDown
    }),
    React.createElement(
      'button',
      { type: 'submit', className: 'ws-send-btn', disabled: disabled || !value.trim() },
      disabled ? 'Thinking...' : 'Send ⚡'
    )
  );
}

module.exports = ChatInput;
module.exports.default = ChatInput;

