import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, X } from 'lucide-react';
import CarSilhouette from '../components/CarSilhouette';
import ChatInterface from '../components/ChatInterface';
import ChatInput from '../components/ChatInput';
import AnnotatedImage from '../components/AnnotatedImage';
import EvidenceRequest from '../components/EvidenceRequest';
import DiagnosticBrief from '../components/DiagnosticBrief';
import ThinkingPane from '../components/ThinkingPane';
import BudgetMeter from '../components/BudgetMeter';
import CaseNotes from '../components/CaseNotes';

export default function CarDetailPage({ cars }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const car = cars.find(c => c.id === id);

  // App states: idle -> investigating -> awaiting_evidence -> complete
  const [appState, setAppState] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  const [showNotes, setShowNotes] = useState(false);

  // Real-time stream states
  const [currentPhase, setCurrentPhase] = useState(null);
  const [emittedPhases, setEmittedPhases] = useState(new Set());
  const [budget, setBudget] = useState(null);
  const [thinkingText, setThinkingText] = useState('');
  const [evidenceRequest, setEvidenceRequest] = useState(null);
  const [brief, setBrief] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Image states
  const [mainImage, setMainImage] = useState(null);
  const [evidenceImage, setEvidenceImage] = useState(null);

  // Chat messages
  const [messages, setMessages] = useState([]);

  // Data states
  const [garages, setGarages] = useState([]);
  const [caseNotes, setCaseNotes] = useState([]);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!car) return;
    fetch(`${API}/api/garages`).then(r => r.json()).then(setGarages).catch(console.error);
    fetch(`${API}/api/case-notes/${car.id}`).then(r => r.json()).then(d => setCaseNotes(d.notes || [])).catch(console.error);
  }, [car]);

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
          setMessages(prev => [...prev, { type: 'phase', phase: data.phase, label: data.label }]);
          break;
        case 'budget':
          setBudget(data);
          break;
        case 'thinking':
          setThinkingText(prev => prev + data.text);
          break;
        case 'evidence_request':
          setEvidenceRequest(data);
          setAppState('awaiting_evidence');
          break;
        case 'annotation':
          setAnnotations(prev => [...prev, data]);
          break;
        case 'brief':
          setBrief(data);
          setAppState('complete');
          break;
        case 'case_note':
          setCaseNotes(prev => [...prev, { timestamp: new Date().toISOString(), note: data.line }]);
          break;
        case 'done':
          if (data.error) {
            setErrorMessage(data.error);
            setMessages(prev => [...prev, { type: 'system', text: `Error: ${data.error}` }]);
            setAppState('idle');
          }
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

  const startInvestigation = async (symptomText, file = null, previewUrl = null) => {
    setAppState('investigating');
    setErrorMessage('');
    setMainImage(previewUrl);
    setEvidenceImage(null);
    setThinkingText('');
    setEmittedPhases(new Set());
    setCurrentPhase('INTAKE');
    setBudget({ used: 0, total: 60000, remaining: 60000 });
    setEvidenceRequest(null);
    setBrief(null);
    setAnnotations([]);
    setSessionId(null);

    // Add user message to chat
    setMessages([
      { type: 'user', text: symptomText, imageUrl: previewUrl }
    ]);

    const formData = new FormData();
    formData.append('symptomText', symptomText);
    formData.append('vehicleId', car.id);
    if (file) formData.append('image', file);

    try {
      const response = await fetch(`${API}/api/investigate`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Investigation failed", error);
      setMessages(prev => [...prev, { type: 'system', text: 'Investigation failed. Please try again.' }]);
      setAppState('idle');
    }
  };

  const submitEvidence = async (file) => {
    if (!sessionId) return;
    setAppState('investigating');
    setErrorMessage('');
    const preview = URL.createObjectURL(file);
    setEvidenceImage(preview);
    setEvidenceRequest(null);
    setAnnotations([]);

    setMessages(prev => [...prev, { type: 'user', text: 'Here is the photo you requested.', imageUrl: preview }]);

    const formData = new FormData();
    formData.append('vehicleId', car.id);
    formData.append('sessionId', sessionId);
    formData.append('image', file);

    try {
      const response = await fetch(`${API}/api/submit-evidence`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Evidence submission failed", error);
      setAppState('idle');
    }
  };

  const handleSendMessage = (text) => {
    if (appState === 'idle') {
      startInvestigation(text);
    }
  };

  const handleSendImage = (file) => {
    if (appState === 'idle') {
      const preview = URL.createObjectURL(file);
      startInvestigation('Please analyze this image for any issues.', file, preview);
    } else if (appState === 'awaiting_evidence') {
      submitEvidence(file);
    }
  };

  const displayImage = evidenceImage || mainImage;
  const isInvestigating = appState === 'investigating';
  const isAlert = appState === 'complete' && brief && (brief.urgency === 'critical' || brief.urgency === 'high');

  if (!car) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)' }}>Car not found</div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ 
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
          <motion.div
            layout
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <CarSilhouette 
              color={car.color || '#3b82f6'} 
              type={car.type || 'sedan'}
              size={appState === 'idle' ? 'large' : 'medium'}
              isAlert={isAlert}
              showReflection={appState === 'idle'}
            />
          </motion.div>

          {/* Car name shown when idle */}
          <AnimatePresence>
            {appState === 'idle' && (
              <motion.div
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
              </motion.div>
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

      {/* ── Budget bar (sticky when active) ── */}
      {appState !== 'idle' && (
        <BudgetMeter 
          budget={budget} 
          currentPhase={currentPhase} 
          emittedPhases={emittedPhases} 
          isActive={true} 
        />
      )}

      {/* ── Bottom: Chat Interface ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {appState === 'idle' ? (
          /* Welcome state */
          <div style={{ 
            flex: 1, 
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
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ maxWidth: 300, alignSelf: 'flex-start' }}
              >
                <AnnotatedImage 
                  imageUrl={displayImage} 
                  annotations={annotations} 
                  isProcessing={isInvestigating} 
                />
              </motion.div>
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
              <DiagnosticBrief brief={brief} garages={garages} />
            )}
          </ChatInterface>
        )}
      </div>

      {/* ── Chat Input Bar ── */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendImage={handleSendImage}
        disabled={isInvestigating}
        placeholder={
          appState === 'awaiting_evidence' 
            ? 'Take the requested photo...' 
            : appState === 'complete' 
              ? 'Start a new investigation...' 
              : 'Describe the issue...'
        }
      />

      {/* ── Case Notes Slide-up Panel ── */}
      <AnimatePresence>
        {showNotes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotes(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 90
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '70vh',
                background: 'var(--bg-surface)',
                borderTopLeftRadius: 'var(--radius-xl)',
                borderTopRightRadius: 'var(--radius-xl)',
                padding: '20px 20px',
                paddingBottom: 'calc(20px + var(--safe-bottom))',
                zIndex: 100,
                overflowY: 'auto'
              }}
              className="custom-scrollbar"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, margin: 0 }}>
                  Vehicle History
                </h2>
                <button
                  onClick={() => setShowNotes(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
              <CaseNotes notes={caseNotes} activeVehicle={car} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
