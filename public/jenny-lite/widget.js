/**
 * Jenny Lite Chat Widget — ToolTime Pro
 *
 * Standalone, zero-dependency embeddable chat widget.
 * Reads configuration from window.JennyLiteConfig:
 *   businessName, greeting, businessType, phone, accentColor, position, faqs[]
 *
 * Usage (paste before </body>):
 *   <script>
 *     window.JennyLiteConfig = { businessName: "Acme Services", phone: "555-1234" };
 *   </script>
 *   <script src="https://cdn.tooltimepro.com/jenny-lite/widget.js" async></script>
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var cfg = window.JennyLiteConfig || {};
  var businessName = cfg.businessName || 'Our Business';
  var greeting =
    cfg.greeting ||
    "Hi! I'm Jenny, your virtual assistant. How can I help you today?";
  var phone = cfg.phone || '';
  var accentColor = cfg.accentColor || '#f5a623';
  var position = cfg.position || 'right';
  var faqs = Array.isArray(cfg.faqs) ? cfg.faqs.filter(function (f) { return f.question && f.answer; }) : [];
  var siteId = cfg.siteId || null;
  var companyId = cfg.companyId || null;
  var apiBase = cfg.apiBase || 'https://tooltimepro.com';

  var isOpen = false;
  var messages = [];
  var leadCaptured = false;
  var leadSaved = false;
  var awaitingInfo = false;

  // ---- Helpers ----

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style' && typeof attrs[k] === 'object') {
          Object.keys(attrs[k]).forEach(function (s) {
            node.style[s] = attrs[k][s];
          });
        } else if (k.indexOf('on') === 0) {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  // ---- Lead Saving ----

  function saveLead(name, phoneNumber, userMessage) {
    if (leadSaved) return;
    if (!siteId && !companyId) return;
    leadSaved = true;

    var transcript = messages.concat([{ sender: 'user', text: userMessage }])
      .map(function (m) { return (m.sender === 'user' ? 'Customer' : 'Jenny AI') + ': ' + m.text; })
      .join('\n');

    if (siteId || companyId) {
      var payload = {
        name: name || 'Chat visitor',
        phone: phoneNumber || null,
        message: transcript,
        source: 'jenny_ai_chat',
      };
      if (siteId) payload.siteId = siteId;
      if (companyId) payload.companyId = companyId;

      var xhr = new XMLHttpRequest();
      xhr.open('POST', apiBase + '/api/website-builder/leads/');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    }
  }

  // ---- Bot Logic ----

  function botReply(text) {
    var lower = text.toLowerCase();

    if (awaitingInfo) {
      awaitingInfo = false;
      leadCaptured = true;

      // Extract phone and name from user's message
      var phoneMatch = text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/);
      var extractedPhone = phoneMatch ? phoneMatch[0] : null;
      var nameCandidate = text.replace(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10}/g, '').replace(/[,.\-]/g, ' ').trim();
      var extractedName = nameCandidate.length >= 2 ? nameCandidate : null;

      saveLead(extractedName, extractedPhone, text);

      return (
        "Thanks! I've passed your info along to the " +
        businessName +
        ' team. Someone will reach out shortly.' +
        (phone ? ' You can also call us at ' + phone + '.' : '')
      );
    }

    // Check FAQ matches first
    for (var i = 0; i < faqs.length; i++) {
      var words = faqs[i].question.toLowerCase().split(/\s+/);
      var matched = 0;
      for (var w = 0; w < words.length; w++) {
        if (words[w].length > 3 && lower.indexOf(words[w]) !== -1) matched++;
      }
      if (matched >= 2 || (words.length <= 3 && matched >= 1)) {
        return faqs[i].answer;
      }
    }

    if (/quote|estimate|price|cost/.test(lower)) {
      awaitingInfo = true;
      return "We'd love to get you a free estimate! Could you share your name and the best phone number to reach you?";
    }

    if (/service|offer|do you do/.test(lower)) {
      return (
        businessName +
        ' offers a full range of professional services. Leave your name and number and we\'ll get back to you' +
        (phone ? ' — or call us at ' + phone : '') +
        '.'
      );
    }

    if (/area|location|where|serve/.test(lower)) {
      return (
        'For details on our service area, leave your info and someone from ' +
        businessName +
        ' will reach out.' +
        (phone ? ' Or call us at ' + phone + '.' : '')
      );
    }

    if (/book|appointment|schedule/.test(lower)) {
      awaitingInfo = true;
      return "I can help get an appointment set up! What's your name and the best number to reach you?";
    }

    if (/phone|call|contact/.test(lower)) {
      return phone
        ? 'You can reach ' + businessName + ' at ' + phone + '. Or leave your info here!'
        : 'Leave your name and phone number and someone from ' + businessName + ' will contact you shortly.';
    }

    awaitingInfo = true;
    return (
      'Thanks for reaching out! Could you share your name and phone number so the ' +
      businessName +
      ' team can follow up?'
    );
  }

  // ---- Render ----

  var container, chatWindow, messagesContainer, inputEl;

  function render() {
    if (container) container.remove();

    container = el('div', {
      id: 'jenny-lite-widget',
      style: { position: 'fixed', bottom: '0', zIndex: '9997', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    });

    // Chat Window
    if (isOpen) {
      var posStyle = position === 'left' ? { left: '20px' } : { right: '20px' };
      chatWindow = el('div', {
        style: Object.assign(
          {
            position: 'fixed',
            bottom: '90px',
            zIndex: '9999',
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
          },
          posStyle
        ),
      });

      // Header
      var header = el(
        'div',
        {
          style: {
            background: accentColor,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          },
        },
        [
          el('div', {
            style: {
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: '0',
              lineHeight: '40px',
              textAlign: 'center',
            },
          }, ['\uD83E\uDD16']),
          el('div', { style: { flex: '1', minWidth: '0' } }, [
            el('div', { style: { fontWeight: '700', fontSize: '14px', color: '#fff' } }, ['Jenny']),
            el('div', { style: { fontSize: '12px', color: 'rgba(255,255,255,0.8)' } }, [businessName]),
          ]),
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
            el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' } }),
            el('span', { style: { fontSize: '12px', color: 'rgba(255,255,255,0.8)' } }, ['Online']),
          ]),
          el('button', {
            onClick: function () { isOpen = false; render(); },
            style: {
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: '1',
            },
            'aria-label': 'Close chat',
          }, ['\u00D7']),
        ]
      );
      chatWindow.appendChild(header);

      // Messages area
      messagesContainer = el('div', {
        style: {
          overflowY: 'auto',
          padding: '16px',
          background: '#f9fafb',
          maxHeight: '340px',
          minHeight: '200px',
        },
      });

      messages.forEach(function (msg) {
        var row = el('div', {
          style: {
            display: 'flex',
            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: '10px',
          },
        });

        if (msg.sender === 'bot') {
          row.appendChild(
            el('div', {
              style: {
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: accentColor + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: '0',
                marginRight: '8px',
                lineHeight: '28px',
                textAlign: 'center',
              },
            }, ['\uD83E\uDD16'])
          );
        }

        row.appendChild(
          el('div', {
            style: {
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.sender === 'user' ? accentColor : '#fff',
              color: msg.sender === 'user' ? '#fff' : '#1f2937',
              fontSize: '14px',
              lineHeight: '1.5',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              border: msg.sender === 'user' ? 'none' : '1px solid #e5e7eb',
            },
          }, [msg.text])
        );

        messagesContainer.appendChild(row);
      });

      // Quick replies (only when greeting is the sole message)
      if (messages.length === 1 && !leadCaptured) {
        var quickReplies = faqs.length > 0
          ? faqs.slice(0, 3).map(function (f) { return f.question; })
          : ['What services do you offer?', 'How do I get a quote?', 'What areas do you serve?'];

        var qrContainer = el('div', {
          style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '36px', marginTop: '4px' },
        });

        quickReplies.forEach(function (qr) {
          qrContainer.appendChild(
            el('button', {
              onClick: function () { sendMessage(qr); },
              style: {
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid ' + accentColor,
                background: 'transparent',
                color: accentColor,
                cursor: 'pointer',
                fontWeight: '500',
              },
            }, [qr])
          );
        });
        messagesContainer.appendChild(qrContainer);
      }

      chatWindow.appendChild(messagesContainer);

      // Input bar
      var inputBar = el('div', {
        style: {
          padding: '12px',
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
          display: 'flex',
          gap: '8px',
        },
      });

      inputEl = el('input', {
        type: 'text',
        placeholder: 'Type a message...',
        style: {
          flex: '1',
          padding: '10px 16px',
          borderRadius: '24px',
          border: 'none',
          background: '#f3f4f6',
          fontSize: '14px',
          outline: 'none',
        },
      });
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
      });
      inputBar.appendChild(inputEl);

      var sendBtn = el('button', {
        onClick: function () { sendMessage(); },
        style: {
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: 'none',
          background: accentColor,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: '0',
        },
        'aria-label': 'Send',
      }, ['\u2191']);
      inputBar.appendChild(sendBtn);
      chatWindow.appendChild(inputBar);

      // Powered by
      chatWindow.appendChild(
        el('div', { style: { textAlign: 'center', padding: '6px 0', background: '#fff', borderTop: '1px solid #f3f4f6' } }, [
          el('a', {
            href: 'https://tooltimepro.com',
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { fontSize: '10px', color: '#9ca3af', textDecoration: 'none' },
          }, ['Powered by ToolTime Pro']),
        ])
      );

      container.appendChild(chatWindow);
    }

    // Floating Bubble
    var bubblePosStyle = position === 'left' ? { left: '20px' } : { right: '20px' };
    var bubble = el('button', {
      onClick: function () {
        isOpen = !isOpen;
        if (isOpen && messages.length === 0) {
          messages.push({ sender: 'bot', text: greeting });
        }
        render();
        if (isOpen && inputEl) inputEl.focus();
      },
      'aria-label': isOpen ? 'Close chat' : 'Open chat',
      style: Object.assign(
        {
          position: 'fixed',
          bottom: '20px',
          zIndex: '9998',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: accentColor,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#fff',
          lineHeight: '1',
          transition: 'transform 0.2s',
        },
        bubblePosStyle
      ),
    }, [isOpen ? '\u00D7' : '\uD83D\uDCAC']);
    container.appendChild(bubble);

    document.body.appendChild(container);

    // Scroll to bottom
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function sendMessage(text) {
    var msg = text || (inputEl ? inputEl.value : '');
    msg = msg.trim();
    if (!msg) return;

    messages.push({ sender: 'user', text: msg });
    render();

    setTimeout(function () {
      var reply = botReply(msg);
      messages.push({ sender: 'bot', text: reply });
      render();
    }, 600);
  }

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
