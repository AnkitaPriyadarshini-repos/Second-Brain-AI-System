const React = require('react');

/**
 * Reusable MessageBubble Component with Markdown & Mathematical Equation Support
 */
function MessageBubble({ message }) {
  if (!message) return null;
  const isOutgoing = message.sender && (message.sender.includes('Ankita') || message.sender.includes('User'));

  let formattedText = message.text;
  let isHtml = false;
  try {
    const utils = require('../../js/utils');
    if (utils && typeof utils.formatMarkdownText === 'function') {
      formattedText = utils.formatMarkdownText(message.text);
      isHtml = true;
    }
  } catch (_) {
    if (typeof window !== 'undefined' && typeof window.formatMarkdownText === 'function') {
      formattedText = window.formatMarkdownText(message.text);
      isHtml = true;
    }
  }

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
      isHtml
        ? React.createElement('div', {
            className: 'ws-msg-text',
            dangerouslySetInnerHTML: { __html: formattedText }
          })
        : React.createElement('div', { className: 'ws-msg-text' }, message.text)
    )
  );
}

module.exports = MessageBubble;
module.exports.default = MessageBubble;
