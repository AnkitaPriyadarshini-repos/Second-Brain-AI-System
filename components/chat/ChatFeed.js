const React = require('react');
const MessageBubble = require('./MessageBubble').default || require('./MessageBubble');

/**
 * Reusable ChatFeed Component
 */
function ChatFeed({ messages = [], feedEndRef }) {
  return React.createElement(
    'div',
    { className: 'ws-msg-feed' },
    messages.map((msg) => React.createElement(MessageBubble, { key: msg.id, message: msg })),
    React.createElement('div', { ref: feedEndRef })
  );
}

module.exports = ChatFeed;
module.exports.default = ChatFeed;
