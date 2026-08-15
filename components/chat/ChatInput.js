const React = require('react');

/**
 * Reusable chat composer.
 * Enter submits; Shift+Enter inserts a newline.
 */
function ChatInput({ value, onChange, onSubmit, disabled = false, placeholder = 'Type a message...' }) {
  const submit = (event) => {
    if (event) event.preventDefault();
    if (disabled || !value || !value.trim()) return;
    if (typeof onSubmit === 'function') onSubmit(event);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit(event);
    }
  };

  return React.createElement(
    'form',
    {
      className: 'ws-input-form',
      onSubmit: submit,
      noValidate: true
    },
    React.createElement('textarea', {
      className: 'ws-input-field',
      placeholder,
      value,
      disabled,
      rows: 1,
      autoComplete: 'off',
      spellCheck: true,
      style: { resize: 'none', minHeight: '42px', fontFamily: 'inherit' },
      onChange: (event) => onChange(event.target.value),
      onKeyDown: handleKeyDown
    }),
    React.createElement(
      'button',
      {
        type: 'submit',
        className: 'ws-send-btn',
        disabled: disabled || !value || !value.trim(),
        'aria-label': disabled ? 'Sending message' : 'Send message'
      },
      disabled ? 'Thinking...' : 'Send ⚡'
    )
  );
}

module.exports = ChatInput;
module.exports.default = ChatInput;
