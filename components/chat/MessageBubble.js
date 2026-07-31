const React = require('react');

/**
 * Reusable MessageBubble Component
 */
function MessageBubble({ message }) {
  if (!message) return null;
  const isOutgoing = message.sender && message.sender.includes('Ankita');

  return React.createElement(
    'div',
    { className: `ws-msg-item ${isOutgoing ? 'outgoing' : ''}` },
    React.createElement('div', { className: 'ws-avatar' }, message.avatar || '⚡'),
    React.createElement(
      'div',
      { className: 'ws-msg-body' },
      React.createElement(
        'div',
        { className: 'ws-msg-meta' },
        React.createElement('span', { className: 'ws-msg-sender' }, message.sender),
        React.createElement(
          'span',
          null,
          message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''
        ),
        React.createElement(
          'span',
          { className: 'ws-latency-tag' },
          message.deliveryLatencyMs ? `${message.deliveryLatencyMs}ms` : '< 20ms'
        )
      ),
      React.createElement('div', { className: 'ws-msg-text' }, message.text)
    )
  );
}

module.exports = MessageBubble;
module.exports.default = MessageBubble;
