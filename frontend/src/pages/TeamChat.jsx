import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, Users, Hash, Plus, Trash2, UserPlus, X, Reply, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import api, { BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function TeamChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState(null);
  const [notification, setNotification] = useState(null);

  // Channels
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null); // null = global
  const [channelMessages, setChannelMessages] = useState({}); // { channelId -> messages[] }
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(null); // channel object
  const [allUsers, setAllUsers] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelMembers, setNewChannelMembers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [allAppUsers, setAllAppUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChannelIdRef = useRef(null);
  const isPrivileged = user.role === 'ADMIN' || user.role === 'MANAGER';
  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null;
  const currentMessages = activeChannelId ? (channelMessages[activeChannelId] || []) : messages;
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  // Fetch all users for @mention (all app users)
  useEffect(() => {
    api.get('/channels/users/all').then(res => setAllAppUsers(res.data)).catch(() => {
      // fallback: agents won't get user list, mention still works without autocomplete
    });
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // Fetch channels
  const fetchChannels = useCallback(() => {
    api.get('/channels').then(res => {
      setChannels(res.data);
    }).catch(console.error);
  }, []);

  useEffect(() => { fetchChannels(); }, []);

  // Fetch all users for manager/admin
  useEffect(() => {
    if (isPrivileged) {
      api.get('/channels/users/all').then(res => setAllUsers(res.data)).catch(console.error);
    }
  }, [isPrivileged]);

  // Load global chat history
  useEffect(() => {
    api.get('/chat/history')
      .then(res => { setMessages(res.data); setLoading(false); setTimeout(scrollToBottom, 100); })
      .catch(() => setLoading(false));
  }, []);

  // Load channel messages when switching channels
  useEffect(() => {
    if (!activeChannelId) return;
    if (channelMessages[activeChannelId]) { setTimeout(scrollToBottom, 100); return; }

    api.get(`/channels/${activeChannelId}/messages`)
      .then(res => {
        setChannelMessages(prev => ({ ...prev, [activeChannelId]: res.data }));
        setTimeout(scrollToBottom, 100);
      })
      .catch(console.error);
    console.log("we got the messages", channelMessages);
  }, [activeChannelId]);

  // Socket setup
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const backendUrl = BASE_URL;

    const newSocket = io(backendUrl, { auth: { token }, autoConnect: false, reconnectionAttempts: 5 });
    newSocket.connect();

    newSocket.on('connect', () => console.log('Connected'));
    newSocket.on('connect_error', err => console.error('Socket error:', err.message));

    newSocket.on('onlineUsers', users => setOnlineUsers(users.filter(u => u.id !== user.id)));

    newSocket.on('userTyping', ({ userId: uid, name }) => {
      if (uid === user.id) return;
      setTypingUsers(prev => prev.find(u => u.userId === uid) ? prev : [...prev, { userId: uid, name }]);
    });
    newSocket.on('userStoppedTyping', ({ userId: uid }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== uid));
    });

    newSocket.on('newMessage', (message) => {
      const cId = message.channelId || null;
      console.log("new message recive", cId, message);
      if (cId) {
        setChannelMessages(prev => ({
          ...prev,
          [cId]: [...(prev[cId] || []), message]
        }));
      } else {
        setMessages(prev => [...prev, message]);
      }
      setTimeout(scrollToBottom, 100);
    });

    newSocket.on('reactionUpdated', ({ messageId, reactions, channelId: cId }) => {
      const updater = msgs => msgs.map(m => m.id === messageId ? { ...m, reactionsGrouped: reactions } : m);
      if (cId) {
        setChannelMessages(prev => ({ ...prev, [cId]: updater(prev[cId] || []) }));
      } else {
        setMessages(updater);
      }
    });

    newSocket.on('mentioned', ({ by, messageContent, channelId: cId }) => {
      setNotification({ by, messageContent });
      setTimeout(() => setNotification(null), 5000);
      if (Notification.permission === 'granted') {
        new Notification(`${by} mentioned you`, { body: messageContent, icon: '/favicon.ico' });
      }
    });

    newSocket.on('channelListUpdated', fetchChannels);
    newSocket.on('addedToChannel', ({ channelId: cId }) => {
      fetchChannels();
      // Clear cache so fresh messages load
      setChannelMessages(prev => { const next = { ...prev }; delete next[cId]; return next; });
    });
    newSocket.on('removedFromChannel', ({ channelId: cId }) => {
      fetchChannels();
      if (activeChannelIdRef.current === cId) setActiveChannelId(null);
    });
    newSocket.on('channelDeleted', ({ channelId: cId }) => {
      fetchChannels();
      if (activeChannelIdRef.current === cId) setActiveChannelId(null);
      setChannelMessages(prev => { const next = { ...prev }; delete next[cId]; return next; });
    });

    setSocket(newSocket);
    return () => { newSocket.off(); newSocket.disconnect(); };
  }, []);

  // @mention autocomplete logic
  const handleTyping = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    if (!socket) return;

    socket.emit('typing', { channelId: activeChannelId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stopTyping', { channelId: activeChannelId }), 1500);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    const textUpToCursor = val.slice(0, cursor);
    const match = textUpToCursor.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(match[0]);
      setMentionSuggestions(
        allAppUsers.filter(u => u.id !== user.id && u.name.toLowerCase().includes(query)).slice(0, 6)
      );
      setMentionIndex(0);
    } else {
      setMentionSuggestions([]);
    }
  };

  const applyMention = (userName) => {
    const cursor = inputRef.current.selectionStart;
    const before = newMessage.slice(0, cursor).replace(/@\w*$/, `@${userName} `);
    const after = newMessage.slice(cursor);
    setNewMessage(before + after);
    setMentionSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionSuggestions.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (mentionSuggestions[mentionIndex]) { e.preventDefault(); applyMention(mentionSuggestions[mentionIndex].name); return; }
      }
      if (e.key === 'Escape') setMentionSuggestions([]);
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionSuggestions.length === 0) handleSend(e);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    console.log('Sending to channelId:', activeChannelId); // ← verify this
    socket.emit('sendMessage', { content: newMessage.trim(), replyToId: replyTo?.id || null, channelId: activeChannelId });
    setNewMessage('');
    setReplyTo(null);
    setMentionSuggestions([]);
    socket.emit('stopTyping', { channelId: activeChannelId });
    clearTimeout(typingTimeoutRef.current);
  };

  const handleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit('addReaction', { messageId, emoji, channelId: activeChannelId });
    setActiveReactionMenu(null);
  };

  const getReactions = (msg) => {
    if (msg.reactionsGrouped) return msg.reactionsGrouped.map(r => ({ emoji: r.emoji, count: r._count.emoji }));
    if (msg.reactions?.length) {
      const grouped = {};
      msg.reactions.forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
      return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
    }
    return [];
  };

  // Channel CRUD
  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await api.post('/channels', { name: newChannelName, description: newChannelDesc, memberIds: newChannelMembers });
      setChannels(prev => [...prev, res.data]);
      socket?.emit('channelCreated', res.data);
      setShowChannelModal(false);
      setNewChannelName(''); setNewChannelDesc(''); setNewChannelMembers([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create channel');
    }
  };

  const deleteChannel = async (channelId) => {
    if (!confirm('Delete this channel and all its messages?')) return;
    try {
      await api.delete(`/channels/${channelId}`);
      socket?.emit('channelDeleted', { channelId });
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannelId === channelId) setActiveChannelId(null);
    } catch (err) {
      alert('Failed to delete channel');
    }
  };

  const addMember = async (channelId, userId) => {
    try {
      const res = await api.post(`/channels/${channelId}/members`, { userIds: [userId] });
      setChannels(prev => prev.map(c => c.id === channelId ? res.data : c));
      setShowManageModal(res.data);
      socket?.emit('memberAdded', { channelId, userId });
    } catch (err) { alert('Failed to add member'); }
  };

  const removeMember = async (channelId, userId) => {
    try {
      await api.delete(`/channels/${channelId}/members/${userId}`);
      const updated = { ...showManageModal, members: showManageModal.members.filter(m => m.user.id !== userId) };
      setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
      setShowManageModal(updated);
      socket?.emit('memberRemoved', { channelId, userId });
    } catch (err) { alert('Failed to remove member'); }
  };

  const renderContent = (text) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent)', borderRadius: 4, padding: '0 3px', fontWeight: 600 }}>{part}</span>
        : part
    );
  };

  if (loading) return <div className="page-header"><h1 className="page-title">Loading chat...</h1></div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0 }}>

      {/* @mention notification banner */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: 'var(--accent)', color: 'white', padding: '12px 16px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxWidth: 320, animation: 'slideIn 0.3s ease' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>🔔 {notification.by} mentioned you</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{notification.messageContent}</div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div style={{ width: sidebarOpen ? 240 : 0, minWidth: sidebarOpen ? 240 : 0, background: 'var(--bg-primary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.2s' }}>

        {/* Sidebar header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>💬 Workspace</span>
        </div>

        {/* Global chat */}
        <button
          onClick={() => setActiveChannelId(null)}
          style={{ textAlign: 'left', padding: '10px 16px', background: activeChannelId === null ? 'var(--accent)' : 'none', color: activeChannelId === null ? 'white' : 'var(--text)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}
        >
          <Users size={14} /> Team Chat
        </button>

        {/* Channels section */}
        <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Channels</span>
          {isPrivileged && (
            <button onClick={() => setShowChannelModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }} title="Create channel">
              <Plus size={14} />
            </button>
          )}
        </div>

        {channels.map(ch => (
          <div key={ch.id} style={{ display: 'flex', alignItems: 'center', paddingRight: 8 }}>
            <button
              onClick={() => setActiveChannelId(ch.id)}
              style={{ flex: 1, textAlign: 'left', padding: '8px 16px', background: activeChannelId === ch.id ? 'rgba(99,102,241,0.12)' : 'none', color: activeChannelId === ch.id ? 'var(--accent)' : 'var(--text)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', borderRadius: 6 }}
            >
              <Hash size={13} /> {ch.name}
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{ch.members?.length || 0}</span>
            </button>
            {isPrivileged && (
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => setShowManageModal(ch)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3 }} title="Manage"><Settings size={12} /></button>
                <button onClick={() => deleteChannel(ch.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3 }} title="Delete"><Trash2 size={12} /></button>
              </div>
            )}
          </div>
        ))}

        {channels.length === 0 && (
          <div style={{ padding: '8px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isPrivileged ? 'Create a channel with +' : 'No channels yet'}
          </div>
        )}

        {/* Online users */}
        <div style={{ marginTop: 'auto', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Online</div>
          {onlineUsers.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only you</div>
            : onlineUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginBottom: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                {u.name}
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          {activeChannel
            ? <><Hash size={18} color="var(--accent)" /><span style={{ fontWeight: 600 }}>{activeChannel.name}</span>{activeChannel.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— {activeChannel.description}</span>}</>
            : <><Users size={18} color="var(--accent)" /><span style={{ fontWeight: 600 }}>Team Chat</span><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— Entire agency</span></>
          }
        </div>

        {/* Messages */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 15, background: 'var(--bg-secondary)' }}
          onClick={() => { setActiveReactionMenu(null); setMentionSuggestions([]); }}
        >
          {currentMessages.length === 0
            ? <div className="empty-state"><div className="empty-state-icon">💬</div><h3>No messages yet</h3><p>Start the conversation!</p></div>
            : currentMessages.map((msg, index) => {
              const isMine = msg.sender?.id === user.id;
              const showName = !isMine && (index === 0 || currentMessages[index - 1].sender?.id !== msg.sender?.id);
              const reactions = getReactions(msg);

              return (
                <div key={msg.id || index} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                  {showName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, marginLeft: 2 }}>{msg.sender?.name}</div>}

                  {msg.replyTo && (
                    <div style={{ fontSize: '0.75rem', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 8, borderLeft: '3px solid var(--accent)', marginBottom: 4, color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600 }}>{msg.replyTo.sender?.name}: </span>{msg.replyTo.content}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    <div style={{ padding: '10px 14px', borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: isMine ? 'var(--accent)' : 'var(--bg-primary)', color: isMine ? 'white' : 'var(--text)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: isMine ? 'none' : '1px solid var(--border)' }}>
                      {renderContent(msg.content)}
                    </div>

                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); setReplyTo({ id: msg.id, content: msg.content, sender: msg.sender?.name }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }} title="Reply"><Reply size={13} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, fontSize: 13 }} title="React">😊</button>
                    </div>

                    {activeReactionMenu === msg.id && (
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', [isMine ? 'right' : 'left']: 0, bottom: '110%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', display: 'flex', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100 }}>
                        {EMOJIS.map(emoji => <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 2 }}>{emoji}</button>)}
                      </div>
                    )}
                  </div>

                  {reactions.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      {reactions.map(({ emoji, count }) => (
                        <span key={emoji} onClick={() => handleReaction(msg.id, emoji)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          }

          {typingUsers.length > 0 && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '14px 14px 14px 2px', border: '1px solid var(--border)' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce 1.2s ease infinite', animationDelay: `${i * 0.2}s` }} />)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply bar */}
        {replyTo && (
          <div style={{ padding: '8px 15px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>↩ {replyTo.sender}: </span>
              {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '...' : ''}
            </div>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: 15, borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', position: 'relative' }}>

          {/* @mention suggestions dropdown */}
          {mentionSuggestions.length > 0 && (
            <div style={{ position: 'absolute', bottom: '100%', left: 15, right: 15, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', marginBottom: 4 }}>
              {mentionSuggestions.map((u, i) => (
                <div
                  key={u.id}
                  onMouseDown={() => applyMention(u.name)}
                  style={{ padding: '8px 14px', cursor: 'pointer', background: i === mentionIndex ? 'rgba(99,102,241,0.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.role}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tab ↹</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Type <strong>@Name</strong> to mention · <strong>Tab</strong> to autocomplete
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder={activeChannel ? `Message #${activeChannel.name}...` : 'Message the team...'}
              style={{ flex: 1, borderRadius: 999 }}
            />
            <button onClick={handleSend} className="btn btn-primary" disabled={!newMessage.trim()} style={{ borderRadius: 999, width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Create Channel Modal ── */}
      {showChannelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 460, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Create Channel</h3>
              <button onClick={() => setShowChannelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Channel Name *</label>
              <input className="form-input" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="e.g. sales-team" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
              <input className="form-input" value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} placeholder="What's this channel about?" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Add Members</label>
              {allUsers.filter(u => u.id !== user.id).map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={newChannelMembers.includes(u.id)}
                    onChange={e => setNewChannelMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                  />
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>{u.name[0]}</div>
                  <span>{u.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{u.role}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowChannelModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createChannel} disabled={!newChannelName.trim()}>Create Channel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Channel Modal ── */}
      {showManageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 460, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Manage #{showManageModal.name}</h3>
              <button onClick={() => setShowManageModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Members</div>
              {showManageModal.members?.map(m => (
                <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: '0.875rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>{m.user.name[0]}</div>
                  <span>{m.user.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.user.role}</span>
                  {m.user.id !== user.id && (
                    <button onClick={() => removeMember(showManageModal.id, m.user.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }} title="Remove"><X size={13} /></button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Add Members</div>
              {allUsers
                .filter(u => !showManageModal.members?.find(m => m.user.id === u.id))
                .map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: '0.875rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>{u.name[0]}</div>
                    <span>{u.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.role}</span>
                    <button onClick={() => addMember(showManageModal.id, u.id)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--accent)', cursor: 'pointer', color: 'var(--accent)', padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem' }}>
                      <UserPlus size={12} style={{ marginRight: 4 }} />Add
                    </button>
                  </div>
                ))}
              {allUsers.filter(u => !showManageModal.members?.find(m => m.user.id === u.id)).length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All users are already members</div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}