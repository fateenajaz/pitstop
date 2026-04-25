import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, X, Trash2, RotateCcw, Pencil, Check } from 'lucide-react';
import CarModel from '../components/CarModel';
import { buildGuidanceFromInstruction, parseAngleFromInstruction } from '../components/carModelGuidance';
import ChatInterface from '../components/ChatInterface';
import ChatInput from '../components/ChatInput';
import AnnotatedImage from '../components/AnnotatedImage';
import EvidenceRequest from '../components/EvidenceRequest';
import DiagnosticBrief from '../components/DiagnosticBrief';
import ThinkingPane from '../components/ThinkingPane';
import CaseNotes from '../components/CaseNotes';

function getChatStorageKey(vehicleId, scope = 'local') {
  return `pitstop-chat-${scope}-${vehicleId}`;
}

function loadPersistedChat(vehicleId, scope) {
  if (!vehicleId) return null;
  try {
    const raw = localStorage.getItem(getChatStorageKey(vehicleId, scope));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistChat(vehicleId, scope, snapshot) {
  if (!vehicleId) return;
  try {
    localStorage.setItem(getChatStorageKey(vehicleId, scope), JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures.
  }
}

function clearPersistedChat(vehicleId, scope) {
  if (!vehicleId) return;
  try {
    localStorage.removeItem(getChatStorageKey(vehicleId, scope));
  } catch {
    // Ignore storage failures.
  }
}

async function fileToDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function isGreeting(text = '') {
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/i.test(text.trim());
}

export default function CarDetailPage({ cars, onDeleteCar, onUpdateCar, apiFetch = fetch, authUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const car = cars.find(c => c.id === id);

  // App states: idle -> investigating -> awaiting_evidence -> awaiting_clarification -> complete
  const [appState, setAppState] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'delete' | 'clear' | null
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Model rotation state
  const [modelAngle, setModelAngle] = useState({ rotateY: 0, rotateX: 0 });
  const [modelGuidance, setModelGuidance] = useState(null);

  // Real-time stream states
  const [currentPhase, setCurrentPhase] = useState(null);
  const [phaseStatus, setPhaseStatus] = useState('');
  const [phaseProgress, setPhaseProgress] = useState(null);
  const [emittedPhases, setEmittedPhases] = useState(new Set());
  const [budget, setBudget] = useState(null);
  const [thinkingText, setThinkingText] = useState('');
  const [evidenceRequest, setEvidenceRequest] = useState(null);
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [brief, setBrief] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [restoreBanner, setRestoreBanner] = useState('');
  const [sessionCursor, setSessionCursor] = useState(0);

  // Image states
  const [mainImage, setMainImage] = useState(null);
  const [evidenceImage, setEvidenceImage] = useState(null);

  // Chat messages
  const [messages, setMessages] = useState([]);

  // Data states
  const [garages, setGarages] = useState([]);
  const [caseNotes, setCaseNotes] = useState([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const hasHydratedChatRef = useRef(false);
  const sessionPollRef = useRef(null);
  const hasRestoredServerSessionRef = useRef(false);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const chatScope = authUser?.id || 'local';

  useEffect(() => {
    if (!car) return;
    apiFetch(`${API}/api/garages`).then(r => r.json()).then(setGarages).catch(console.error);
    apiFetch(`${API}/api/case-notes/${car.id}`).then(r => r.json()).then(d => setCaseNotes(d.notes || [])).catch(console.error);
  }, [API, apiFetch, car]);

  useEffect(() => {
    hasRestoredServerSessionRef.current = false;
  }, [car?.id]);

  useEffect(() => {
    if (!car) return;

    const saved = loadPersistedChat(car.id, chatScope);
    if (!saved) {
      hasHydratedChatRef.current = true;
      return;
    }

    const restoredMessages = Array.isArray(saved.messages) ? saved.messages : [];
    /* eslint-disable react-hooks/set-state-in-effect */
    const normalizedMessages = restoredMessages.filter((message) => {
      if (!message) return false;
      if (
        saved.appState === 'awaiting_clarification' &&
        saved.followUpQuestion?.question &&
        message?.type === 'agent' &&
        message?.content === saved.followUpQuestion.question
      ) {
        return false;
      }
      return true;
    });

    setMessages(normalizedMessages);
    setMainImage(saved.mainImage || null);
    setEvidenceImage(saved.evidenceImage || null);
    setCurrentPhase(saved.currentPhase || null);
    setPhaseStatus(saved.phaseStatus || '');
    setPhaseProgress(typeof saved.phaseProgress === 'number' ? saved.phaseProgress : null);
    setEmittedPhases(new Set(Array.isArray(saved.emittedPhases) ? saved.emittedPhases : []));
    setBudget(saved.budget || null);
    setThinkingText(saved.thinkingText || '');
    setEvidenceRequest(saved.evidenceRequest || null);
    setFollowUpQuestion(saved.followUpQuestion || null);
    setBrief(saved.brief || null);
    setAnnotations(Array.isArray(saved.annotations) ? saved.annotations : []);
    setSessionId(saved.sessionId || null);
    setSessionCursor(typeof saved.sessionCursor === 'number' ? saved.sessionCursor : 0);
    setModelAngle(saved.modelAngle || { rotateY: 0, rotateX: 0 });
    setModelGuidance(saved.modelGuidance || null);

    if (saved.appState === 'awaiting_evidence' && saved.evidenceRequest) {
      setAppState('awaiting_evidence');
    } else if (saved.appState === 'awaiting_clarification' && saved.followUpQuestion) {
      setAppState('awaiting_clarification');
    } else if (saved.appState === 'investigating' && saved.sessionId) {
      setAppState('investigating');
      setRestoreBanner('Restoring active investigation...');
    } else if (saved.appState === 'complete' && saved.brief) {
      setAppState('complete');
    } else if (restoredMessages.length > 0) {
      setAppState('idle');
      setRestoreBanner('Saved chat restored after refresh.');
    } else {
      setAppState('idle');
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    hasHydratedChatRef.current = true;
  }, [car, chatScope]);

  useEffect(() => {
    if (!car || !hasHydratedChatRef.current) return;

    persistChat(car.id, chatScope, {
      appState,
      sessionId,
      sessionCursor,
      currentPhase,
      phaseStatus,
      phaseProgress,
      emittedPhases: Array.from(emittedPhases),
      budget,
      thinkingText,
      evidenceRequest,
      followUpQuestion,
      brief,
      annotations,
      mainImage,
      evidenceImage,
      messages,
      modelAngle,
      modelGuidance,
    });
  }, [
    annotations,
    appState,
    brief,
    budget,
    car,
    chatScope,
    currentPhase,
    emittedPhases,
    evidenceImage,
    evidenceRequest,
    followUpQuestion,
    mainImage,
    messages,
    modelAngle,
    modelGuidance,
    phaseProgress,
    phaseStatus,
    sessionId,
    sessionCursor,
    thinkingText,
  ]);

  const handleSseMessage = (event, dataStr) => {
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      switch (event) {
        case 'session_start':
          setSessionId(data.sessionId);
          break;
        case 'phase':
          setCurrentPhase(data.phase);
          setEmittedPhases(prev => new Set(prev).add(data.phase));
          break;
        case 'phase_update':
          setCurrentPhase(data.phase);
          setPhaseStatus(data.status || '');
          setPhaseProgress(typeof data.progress === 'number' ? data.progress : null);
          setEmittedPhases(prev => new Set(prev).add(data.phase));
          break;
        case 'budget':
          setBudget(data);
          break;
        case 'thinking':
          setThinkingText(prev => prev + data.text);
          break;
        case 'camera_guidance':
          setModelGuidance(data);
          if (typeof data.rotationY === 'number' || typeof data.tiltX === 'number') {
            setModelAngle({
              rotateY: typeof data.rotationY === 'number' ? data.rotationY : 0,
              rotateX: typeof data.tiltX === 'number' ? data.tiltX : 0,
            });
          }
          break;
        case 'evidence_request':
          setEvidenceRequest(data);
          setFollowUpQuestion(null);
          setAppState('awaiting_evidence');
          // Rotate the model to guide user to the right angle
          if (data.instruction) {
            const angle = parseAngleFromInstruction(data.instruction);
            const guidance = data.guidance || buildGuidanceFromInstruction(data.instruction);
            setModelGuidance(guidance);
            setModelAngle({
              rotateY: typeof guidance?.rotationY === 'number' ? guidance.rotationY : angle.rotateY,
              rotateX: typeof guidance?.tiltX === 'number' ? guidance.tiltX : angle.rotateX,
            });
          }
          break;
        case 'follow_up_question':
          setFollowUpQuestion(data);
          setEvidenceRequest(null);
          setAppState('awaiting_clarification');
          setMessages((prev) => {
            const alreadyExists = prev.some(
              (message) => message?.type === 'clarification' && message?.question === data.question,
            );
            if (alreadyExists) return prev;
            return [...prev, { type: 'clarification', question: data.question, why: data.why || '' }];
          });
          break;
        case 'annotation':
          setAnnotations(prev => [...prev, data]);
          break;
        case 'brief':
          setBrief(data);
          setAppState('complete');
          setModelAngle({ rotateY: 0, rotateX: 0 }); // Reset rotation
          setModelGuidance(null);
          setPhaseStatus('Diagnosis complete.');
          setPhaseProgress(1);
          break;
        case 'case_note':
          setCaseNotes(prev => [...prev, { timestamp: new Date().toISOString(), note: data.line }]);
          break;
        case 'done':
          if (data.error) {
            setMessages(prev => [...prev, { type: 'system', text: `Error: ${data.error}` }]);
            setAppState('idle');
            setModelGuidance(null);
            setSessionId(null);
            setSessionCursor(0);
          }
          setIsLiveStreaming(false);
          break;
      }
    } catch (e) {
      console.error("Failed to parse SSE data", e, dataStr);
    }
  };

  const readSseStream = async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const parts = block.split('\n');
        let eventName = 'message';
        let dataStr = '';
        for (const line of parts) {
          if (line.startsWith('event: ')) eventName = line.substring(7);
          else if (line.startsWith('data: ')) dataStr = line.substring(6);
        }
        if (dataStr) handleSseMessage(eventName, dataStr);
      }
    }
  };

  const applyServerSessionState = (session, { fromRefresh = false } = {}) => {
    if (!session) return;

    setSessionId(session.sessionId || null);
    setCurrentPhase(session.currentPhase || null);
    setPhaseStatus(session.phaseStatus || '');
    setPhaseProgress(typeof session.phaseProgress === 'number' ? session.phaseProgress : null);
    setBudget(session.budget || null);
    setModelGuidance(session.modelGuidance || null);
    setEvidenceRequest(session.evidenceRequest || null);
    setFollowUpQuestion(session.followUpQuestion || null);
    setBrief(session.brief || null);
    setAnnotations(Array.isArray(session.annotations) ? session.annotations : []);
    if (session.followUpQuestion?.question) {
      setMessages((prev) => {
        const alreadyExists = prev.some(
          (message) => message?.type === 'clarification' && message?.question === session.followUpQuestion.question,
        );
        if (alreadyExists) return prev;
        return [...prev, { type: 'clarification', question: session.followUpQuestion.question, why: session.followUpQuestion.why || '' }];
      });
    }

    if (session.currentPhase) {
      setEmittedPhases((prev) => new Set(prev).add(session.currentPhase));
    }

    if (session.modelGuidance && (typeof session.modelGuidance.rotationY === 'number' || typeof session.modelGuidance.tiltX === 'number')) {
      setModelAngle({
        rotateY: typeof session.modelGuidance.rotationY === 'number' ? session.modelGuidance.rotationY : 0,
        rotateX: typeof session.modelGuidance.tiltX === 'number' ? session.modelGuidance.tiltX : 0,
      });
    }

    if (session.status === 'awaiting_evidence') {
      setAppState('awaiting_evidence');
    } else if (session.status === 'awaiting_clarification') {
      setAppState('awaiting_clarification');
    } else if (session.status === 'complete') {
      setAppState('complete');
    } else if (session.status === 'streaming') {
      setAppState('investigating');
    } else if (session.status === 'error' && fromRefresh) {
      if (!session.brief) {
        setSessionId(null);
        setSessionCursor(0);
      }
      setAppState(session.brief ? 'complete' : 'idle');
    }
  };

  useEffect(() => {
    if (!car || !hasHydratedChatRef.current) return undefined;
    if (hasRestoredServerSessionRef.current) return undefined;
    hasRestoredServerSessionRef.current = true;

    let cancelled = false;

    const syncSession = async () => {
      try {
        const response = await apiFetch(`${API}/api/investigation-state/${car.id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data?.session) return;

        applyServerSessionState(data.session, { fromRefresh: true });
        setSessionCursor(typeof data.cursor === 'number' ? data.cursor : 0);

        if (data.session.status === 'streaming') {
          setRestoreBanner('Active investigation restored from the backend. Live updates resumed.');
        } else if (data.session.status === 'awaiting_evidence' || data.session.status === 'awaiting_clarification') {
          setRestoreBanner('Pending investigation restored from the backend session.');
        }
      } catch (error) {
        console.error('Failed to restore investigation session', error);
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [API, apiFetch, car]);

  useEffect(() => {
    if (sessionPollRef.current) {
      window.clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }

    if (!car || !sessionId || appState !== 'investigating' || brief || isLiveStreaming) return undefined;

    sessionPollRef.current = window.setInterval(async () => {
      try {
        const response = await apiFetch(`${API}/api/investigation-state/${car.id}?since=${sessionCursor}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data?.session) return;

        applyServerSessionState(data.session, { fromRefresh: true });
        const events = Array.isArray(data.events) ? data.events : [];
        events.forEach((entry) => {
          handleSseMessage(entry.event, JSON.stringify(entry.data));
        });
        setSessionCursor(typeof data.cursor === 'number' ? data.cursor : sessionCursor);

        if (data.session.status !== 'streaming' && sessionPollRef.current) {
          window.clearInterval(sessionPollRef.current);
          sessionPollRef.current = null;
        }
      } catch (error) {
        console.error('Failed to poll investigation session', error);
      }
    }, 1250);

    return () => {
      if (sessionPollRef.current) {
        window.clearInterval(sessionPollRef.current);
        sessionPollRef.current = null;
      }
    };
  }, [API, apiFetch, appState, brief, car, isLiveStreaming, sessionCursor, sessionId]);

  const startInvestigation = async (symptomText, file = null, previewUrl = null) => {
    setAppState('investigating');
    setIsLiveStreaming(true);
    setRestoreBanner('');
    setSessionCursor(0);
    setMainImage(previewUrl);
    setEvidenceImage(null);
    setThinkingText('');
    setEmittedPhases(new Set());
    setCurrentPhase('INTAKE');
    setPhaseStatus('Preparing the investigation.');
    setPhaseProgress(0.04);
    setBudget({ used: 0, total: 60000, remaining: 60000 });
    setEvidenceRequest(null);
    setFollowUpQuestion(null);
    setBrief(null);
    setAnnotations([]);
    setSessionId(null);
    setModelAngle({ rotateY: 0, rotateX: 0 });
    setModelGuidance(null);

    // Add user message to chat
    setMessages([
      { type: 'user', text: symptomText, imageUrl: previewUrl }
    ]);

    const formData = new FormData();
    formData.append('symptomText', symptomText);
    formData.append('vehicleId', car.id);
    if (file) formData.append('image', file);

    try {
      const response = await apiFetch(`${API}/api/investigate`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Investigation failed", error);
      setMessages(prev => [...prev, { type: 'system', text: 'Investigation failed. Please try again.' }]);
      setAppState('idle');
      setSessionId(null);
      setSessionCursor(0);
    } finally {
      setIsLiveStreaming(false);
    }
  };

  const submitEvidence = async (file, previewOverride = null) => {
    if (!sessionId) return;
    setAppState('investigating');
    setIsLiveStreaming(true);
    setRestoreBanner('');
    const preview = previewOverride || await fileToDataUrl(file).catch(() => null);
    setEvidenceImage(preview);
    setEvidenceRequest(null);
    setFollowUpQuestion(null);
    setAnnotations([]);
    setPhaseStatus('Uploading the requested angle.');
    setPhaseProgress(0.52);

    setMessages(prev => [...prev, { type: 'user', text: 'Here is the photo you requested.', imageUrl: preview }]);

    const formData = new FormData();
    formData.append('vehicleId', car.id);
    formData.append('sessionId', sessionId);
    formData.append('image', file);

    try {
      const response = await apiFetch(`${API}/api/submit-evidence`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Evidence submission failed", error);
      setAppState('idle');
      setSessionId(null);
      setSessionCursor(0);
    } finally {
      setIsLiveStreaming(false);
    }
  };

  const submitClarification = async (answerText) => {
    if (!sessionId || !answerText.trim()) return;
    setAppState('investigating');
    setIsLiveStreaming(true);
    setRestoreBanner('');
    setFollowUpQuestion(null);
    setPhaseStatus('Reviewing the added symptom details.');
    setPhaseProgress(0.32);
    setMessages(prev => [...prev, { type: 'user', text: answerText.trim() }]);

    try {
      const response = await apiFetch(`${API}/api/submit-clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answerText: answerText.trim() }),
      });
      await readSseStream(response);
    } catch (error) {
      console.error('Clarification submission failed', error);
      setMessages(prev => [...prev, { type: 'system', text: 'Clarification submission failed. Please try again.' }]);
      setAppState('idle');
      setSessionId(null);
      setSessionCursor(0);
    } finally {
      setIsLiveStreaming(false);
    }
  };

  const handleSendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if ((appState === 'idle' || appState === 'complete') && messages.length === 0 && isGreeting(trimmed)) {
      setMessages([
        { type: 'user', text: trimmed },
        { type: 'agent', content: 'Hello. Describe the vehicle issue or send a photo and I will help diagnose it.' },
      ]);
      return;
    }

    if (appState === 'awaiting_clarification') {
      submitClarification(trimmed);
      return;
    }

    if (appState === 'idle' && !brief && !sessionId) {
      startInvestigation(text);
      return;
    }

    if (appState === 'complete' || brief) {
      setMessages((prev) => [...prev, { type: 'user', text: trimmed }]);
      setAppState('investigating');
      setRestoreBanner('');
      apiFetch(`${API}/api/chat-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: car.id,
          promptText: trimmed,
          chatMessages: [...messages, { type: 'user', text: trimmed }],
          brief,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Follow-up failed: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          setMessages((prev) => [...prev, { type: 'agent', content: data.reply || 'I could not generate a follow-up response.' }]);
          setAppState(brief ? 'complete' : 'idle');
        })
        .catch((error) => {
          console.error('Follow-up chat failed', error);
          setMessages((prev) => [...prev, { type: 'system', text: 'Follow-up failed. Please try again.' }]);
          setAppState(brief ? 'complete' : 'idle');
        });
    }
  };

  const handleSendImage = (file) => {
    if (appState === 'idle' && !brief && !sessionId) {
      fileToDataUrl(file)
        .then((preview) => {
          startInvestigation('Please analyze this image for any issues.', file, preview);
        })
        .catch(() => {
          startInvestigation('Please analyze this image for any issues.', file, null);
        });
    } else if (appState === 'awaiting_evidence') {
      fileToDataUrl(file)
        .then((preview) => submitEvidence(file, preview))
        .catch(() => submitEvidence(file, null));
    }
  };

  const displayImage = evidenceImage || mainImage;
  const isInvestigating = appState === 'investigating';
  const isAlert = appState === 'complete' && brief && (brief.urgency === 'critical' || brief.urgency === 'high');
  const hasConversation = messages.length > 0 || appState !== 'idle';
  const followUpChips = [
    'Why this diagnosis?',
    'Is it safe to drive?',
    'What should I ask the garage?',
    'Could it be something else?',
  ];

  if (!car) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)' }}>Car not found</div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ 
      height: '100dvh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'relative', zIndex: 30, flexShrink: 0, background: 'var(--bg-primary)' }}>
        {/* ── Top: Car Silhouette Area ── */}
        <div style={{ 
          position: 'relative',
          minHeight: appState === 'idle' ? '42vh' : '28vh',
          transition: 'min-height 0.5s ease',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          {/* Back button + car name (floating over car) */}
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '16px 20px',
            paddingTop: 'calc(16px + var(--safe-top))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => navigate('/')}
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                padding: 8,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                backdropFilter: 'blur(10px)'
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <button
              onClick={() => setShowNotes(true)}
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', 
                cursor: 'pointer',
                padding: 8,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                backdropFilter: 'blur(10px)'
              }}
            >
              <FileText size={20} />
            </button>
          </div>

          {/* Car silhouette centered */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            paddingTop: 60
          }}>
            <Motion.div
              layout
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <CarModel 
                model3d={car.model3d}
                svgString={car.svgModel}
                color={car.color || '#3b82f6'} 
                type={car.type || 'sedan'}
              size={appState === 'idle' ? 'large' : 'medium'}
              rotateY={modelAngle.rotateY}
              rotateX={modelAngle.rotateX}
              guidance={modelGuidance}
              phaseLabel=""
              phaseStatus=""
              isAlert={isAlert}
              showReflection={appState === 'idle'}
            />
            </Motion.div>

            {/* Car name shown when idle */}
            <AnimatePresence>
              {appState === 'idle' && (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{ textAlign: 'center', marginTop: 12 }}
                >
                  <div style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontSize: 22, 
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    {car.name}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 4
                  }}>
                    {car.label || 'Vehicle'}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gradient fade into chat area */}
          <div className="gradient-fade-down" style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            pointerEvents: 'none',
            zIndex: 10
          }} />
        </div>

      </div>

      {/* ── Bottom: Chat Interface ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {restoreBanner && (
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(96,165,250,0.22)',
                background: 'rgba(37,99,235,0.08)',
                color: 'var(--text-secondary)',
                fontSize: 12,
              }}
            >
              <span>{restoreBanner}</span>
              <button
                onClick={() => setRestoreBanner('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {!hasConversation ? (
          /* Welcome state */
          <div style={{ 
            flex: 1, 
            minHeight: 0,
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '0 32px',
            gap: 12,
            paddingBottom: 100
          }}>
            <div style={{ 
              fontSize: 15, 
              color: 'var(--text-secondary)', 
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              Describe what's wrong, or take a photo of the issue.
            </div>
            <div style={{ 
              fontSize: 12, 
              color: 'var(--text-muted)', 
              fontFamily: 'var(--font-mono)',
              textAlign: 'center'
            }}>
              AI-powered diagnostics by Claude Opus 4.7
            </div>
          </div>
        ) : (
          /* Chat area */
          <ChatInterface messages={messages} isTyping={isInvestigating}>
            {/* Annotated image inline */}
            {displayImage && (
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: 300, alignSelf: 'flex-start' }}
              >
                <AnnotatedImage 
                  imageUrl={displayImage} 
                  annotations={annotations} 
                  isProcessing={isInvestigating} 
                />
              </Motion.div>
            )}

            {/* Thinking pane */}
            {thinkingText && (
              <ThinkingPane 
                thinkingText={thinkingText} 
                isComplete={appState === 'complete'} 
              />
            )}

            {/* Evidence request */}
            {appState === 'awaiting_evidence' && evidenceRequest && (
              <EvidenceRequest request={evidenceRequest} onSubmit={submitEvidence} />
            )}

            {/* Diagnostic brief */}
            {appState === 'complete' && brief && (
              <>
                <DiagnosticBrief brief={brief} garages={garages} />
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 12,
                    alignSelf: 'flex-start',
                    maxWidth: 420,
                  }}
                >
                  {followUpChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSendMessage(chip)}
                      disabled={isInvestigating}
                      style={{
                        borderRadius: 999,
                        border: '1px solid rgba(59,130,246,0.24)',
                        background: 'rgba(59,130,246,0.08)',
                        color: 'var(--text-secondary)',
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: isInvestigating ? 'default' : 'pointer',
                        opacity: isInvestigating ? 0.6 : 1,
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </>
            )}
          </ChatInterface>
        )}
      </div>

      {/* ── Chat Input Bar ── */}
      {appState !== 'awaiting_evidence' && (
        <ChatInput
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
          disabled={isInvestigating}
          placeholder={
            appState === 'awaiting_clarification'
              ? 'Answer the clarification question...'
              : appState === 'complete'
              ? 'Ask a follow-up about this diagnosis...'
              : 'Describe the issue...'
          }
        />
      )}

      {/* ── Case Notes Slide-up Panel ── */}
      <AnimatePresence>
        {showNotes && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowNotes(false); setConfirmAction(null); setIsEditingName(false); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }}
            />
            <Motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '80vh', background: 'var(--bg-surface)',
                borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                padding: '20px', paddingBottom: 'calc(20px + var(--safe-bottom))',
                zIndex: 100, overflowY: 'auto'
              }}
              className="custom-scrollbar"
            >
              {/* Panel header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, margin: 0 }}>
                  {car.name}
                </h2>
                <button
                  onClick={() => { setShowNotes(false); setConfirmAction(null); setIsEditingName(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* ── Car Management Section ── */}
              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                  Manage
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <button
                    onClick={() => { setEditName(car.name); setIsEditingName(true); setConfirmAction(null); }}
                    aria-label="Rename car"
                    title="Rename car"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: 56, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', cursor: 'pointer'
                    }}
                  >
                    <Pencil size={18} color="var(--text-secondary)" />
                  </button>
                  <button
                    onClick={() => { setConfirmAction('clear'); setIsEditingName(false); }}
                    aria-label="Clear history"
                    title="Clear history"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: 56, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={18} color="var(--text-secondary)" />
                  </button>
                  <button
                    onClick={() => { setConfirmAction('delete'); setIsEditingName(false); }}
                    aria-label="Delete car"
                    title="Delete car"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: 56, background: 'var(--bg-elevated)',
                      border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)',
                      color: 'var(--accent-red)', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 20 }} />

              {/* Case notes */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
                Investigation History
              </div>
              <CaseNotes notes={caseNotes} activeVehicle={car} />
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isEditingName || confirmAction) && (
          <>
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditingName(false); setConfirmAction(null); }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(6px)',
                zIndex: 140,
              }}
            />
            <Motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                paddingTop: 'calc(24px + var(--safe-top))',
                paddingBottom: 'calc(24px + var(--safe-bottom))',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 420,
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: 22,
                }}
              >
                {isEditingName ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
                      Rename Car
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                      Update the vehicle name shown in your garage and investigation history.
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: 15,
                        outline: 'none',
                        fontFamily: 'var(--font-body)',
                        marginBottom: 16,
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) {
                          onUpdateCar(car.id, { name: editName.trim() });
                          setIsEditingName(false);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setIsEditingName(false)}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-secondary)',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (editName.trim()) {
                            onUpdateCar(car.id, { name: editName.trim() });
                            setIsEditingName(false);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: editName.trim() ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          color: editName.trim() ? 'white' : 'var(--text-muted)',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: editName.trim() ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : confirmAction === 'clear' ? (
                  <>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
                      Clear History
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                      Remove all saved investigations, notes, chat history, and active diagnostic state for this car?
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setConfirmAction(null)}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-secondary)',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await Promise.all([
                              apiFetch(`${API}/api/case-notes/${car.id}`, { method: 'DELETE' }),
                              apiFetch(`${API}/api/investigation-state/${car.id}`, { method: 'DELETE' }),
                            ]);
                            setCaseNotes([]);
                            clearPersistedChat(car.id, chatScope);
                            setMessages([]);
                            setMainImage(null);
                            setEvidenceImage(null);
                            setCurrentPhase(null);
                            setPhaseStatus('');
                            setPhaseProgress(null);
                            setEmittedPhases(new Set());
                            setBudget(null);
                            setThinkingText('');
                            setEvidenceRequest(null);
                            setFollowUpQuestion(null);
                            setBrief(null);
                            setAnnotations([]);
                            setSessionId(null);
                            setSessionCursor(0);
                            setModelAngle({ rotateY: 0, rotateX: 0 });
                            setModelGuidance(null);
                            setRestoreBanner('');
                            setAppState('idle');
                          } catch (e) {
                            console.error(e);
                          }
                          setConfirmAction(null);
                          setShowNotes(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'var(--accent-amber)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--accent-red)' }}>
                      Delete Car
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                      Permanently remove this car and all associated investigation data from your garage?
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setConfirmAction(null)}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-secondary)',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await apiFetch(`${API}/api/investigation-state/${car.id}`, { method: 'DELETE' });
                          } catch (error) {
                            console.error(error);
                          }
                          clearPersistedChat(car.id, chatScope);
                          setRestoreBanner('');
                          setSessionCursor(0);
                          await onDeleteCar(car.id);
                          navigate('/');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'var(--accent-red)',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          color: 'white',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
