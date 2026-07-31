const React = require('react');
const { useState, useEffect, useRef } = React;

const PerformanceHUD = require('./PerformanceHUD').default || require('./PerformanceHUD');
const ChatFeed = require('./chat/ChatFeed').default || require('./chat/ChatFeed');
const ChatInput = require('./chat/ChatInput').default || require('./chat/ChatInput');
const Badge = require('./ui/Badge').default || require('./ui/Badge');

/**
 * RealTimeChat Component
 * Next.js SSR-rendered real-time chat window composed of modular, reusable UI components.
 */
function RealTimeChat({ initialHistory = [], initialMetrics = {} }) {
  const [messages, setMessages] = useState(initialHistory);
  const [inputText, setInputText] = useState('');
  const [currentRoom, setCurrentRoom] = useState('general');
  const [activeUsersCount, setActiveUsersCount] = useState(2);
  const [latencyInfo, setLatencyInfo] = useState({ average: 18, latest: 15, isUnder300ms: true });
  const [metrics, setMetrics] = useState({
    targetLatencyMs: 300,
    messagesSent: initialHistory.length,
    minLatency: 12,
    maxLatency: 35
  });

  const engineRef = useRef(null);
  const feedEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const WebSocketChatEngine = require('../js/websocket-chat-engine');
      const engine = new WebSocketChatEngine();
      engineRef.current = engine;

      engine.on('message', (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? { ...m, ...msg, isOptimistic: false } : m));
          }
          return [...prev, msg];
        });
      });

      engine.on('latency', (data) => {
        setLatencyInfo(data);
      });

      engine.on('metrics', (data) => {
        setMetrics((prev) => ({ ...prev, ...data }));
      });

      engine.init();
    }
  }, []);

  useEffect(() => {
    if (feedEndRef.current && typeof feedEndRef.current.scrollIntoView === 'function') {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (engineRef.current) {
      const optimisticMsg = engineRef.current.sendMessage(
        textToSend,
        'Ankita (Researcher)',
        currentRoom,
        '👩‍💻'
      );
      setMessages((prev) => [...prev, optimisticMsg]);
    }
  };

  const filteredMessages = messages.filter((m) => !m.room || m.room === currentRoom);

  return React.createElement(
    'div',
    { className: 'ws-chat-wrapper' },
    React.createElement(PerformanceHUD, {
      latency: latencyInfo,
      metrics,
      ssrMetrics: {
        speedupFactor: '2.3x',
        ssrLoadTimeMs: 135,
        csrLoadTimeMs: 320
      }
    }),
    React.createElement(
      'div',
      { className: 'ws-chat-container' },
      // Sidebar Channels
      React.createElement(
        'div',
        { className: 'ws-chat-sidebar' },
        React.createElement('div', { className: 'ws-sidebar-section-title' }, 'Channels'),
        React.createElement(
          'button',
          {
            className: `ws-room-pill ${currentRoom === 'general' ? 'active' : ''}`,
            onClick: () => setCurrentRoom('general')
          },
          React.createElement('span', null, '# general'),
          React.createElement(Badge, { variant: 'pass' }, 'Live')
        ),
        React.createElement(
          'button',
          {
            className: `ws-room-pill ${currentRoom === 'engineering' ? 'active' : ''}`,
            onClick: () => setCurrentRoom('engineering')
          },
          React.createElement('span', null, '# engineering')
        ),
        React.createElement(
          'button',
          {
            className: `ws-room-pill ${currentRoom === 'research' ? 'active' : ''}`,
            onClick: () => setCurrentRoom('research')
          },
          React.createElement('span', null, '# research')
        ),
        React.createElement(
          'div',
          { className: 'ws-sidebar-section-title', style: { marginTop: '1rem' } },
          `Active Peers (${activeUsersCount})`
        ),
        React.createElement(
          'div',
          { className: 'ws-user-item' },
          React.createElement('span', { className: 'ws-pulse-dot' }),
          React.createElement('span', null, 'Juno AI Assistant (SSR)')
        ),
        React.createElement(
          'div',
          { className: 'ws-user-item' },
          React.createElement('span', { className: 'ws-pulse-dot' }),
          React.createElement('span', null, 'Ankita Priyadarshini')
        )
      ),

      // Chat Main Panel
      React.createElement(
        'div',
        { className: 'ws-chat-main' },
        React.createElement(
          'div',
          { className: 'ws-chat-header' },
          React.createElement(
            'div',
            { className: 'ws-chat-title' },
            React.createElement('span', null, `# ${currentRoom}`),
            React.createElement(Badge, { variant: 'pass' }, 'WebSockets Active')
          ),
          React.createElement(
            'div',
            { style: { fontSize: '0.85rem', color: 'var(--ws-text-muted)' } },
            `Server Time: ${new Date().toLocaleTimeString()}`
          )
        ),

        // Reusable ChatFeed Component
        React.createElement(ChatFeed, { messages: filteredMessages, feedEndRef }),

        // Reusable ChatInput Component
        React.createElement(ChatInput, {
          value: inputText,
          onChange: setInputText,
          onSubmit: handleSend,
          placeholder: `Message #${currentRoom} (WebSockets streaming under <300ms latency)...`
        })
      )
    )
  );
}

module.exports = RealTimeChat;
module.exports.default = RealTimeChat;
