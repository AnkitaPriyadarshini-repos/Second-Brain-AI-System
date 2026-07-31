const React = require('react');

/**
 * Reusable Badge Component
 */
function Badge({ variant = 'pass', children, style = {} }) {
  const isPass = variant === 'pass';
  const isSsr = variant === 'ssr';
  const isWarning = variant === 'warning';

  let bg = 'rgba(16, 185, 129, 0.15)';
  let border = '1px solid rgba(16, 185, 129, 0.4)';
  let color = '#34d399';

  if (isSsr) {
    bg = 'rgba(6, 182, 212, 0.2)';
    border = '1px solid rgba(6, 182, 212, 0.4)';
    color = '#38bdf8';
  } else if (isWarning) {
    bg = 'rgba(239, 68, 68, 0.2)';
    border = '1px solid rgba(239, 68, 68, 0.4)';
    color = '#f87171';
  }

  return React.createElement(
    'span',
    {
      className: 'ws-badge-pass',
      style: {
        background: bg,
        border,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: 600,
        ...style
      }
    },
    children
  );
}

module.exports = Badge;
module.exports.default = Badge;
