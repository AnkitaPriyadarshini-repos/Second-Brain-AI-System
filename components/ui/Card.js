const React = require('react');

/**
 * Reusable Card Component
 */
function Card({ title, value, subtext, variant = 'default', children, style = {} }) {
  const isSsr = variant === 'ssr';
  return React.createElement(
    'div',
    {
      className: `ws-hud-card ${isSsr ? 'ssr-card' : ''}`,
      style
    },
    title && React.createElement('div', { className: 'ws-hud-label' }, title),
    value && React.createElement('div', { className: 'ws-hud-val' }, value),
    subtext && React.createElement('div', { className: 'ws-hud-subtext' }, subtext),
    children
  );
}

module.exports = Card;
module.exports.default = Card;
