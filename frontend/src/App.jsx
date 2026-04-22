import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import BudgetMeter from './components/BudgetMeter';
import ThinkingPane from './components/ThinkingPane';
import UploadZone from './components/UploadZone';
import AnnotatedImage from './components/AnnotatedImage';
import EvidenceRequest from './components/EvidenceRequest';
import DiagnosticBrief from './components/DiagnosticBrief';
import CaseNotes from './components/CaseNotes';

const VEHICLES = [
  {
    id: "demo-vehicle-1",
    label: "2019 Toyota Camry",
    vin: "4T1B11HK0KU253402"
  }
];

export default function App() {
  const [activeVehicle, setActiveVehicle] = useState(VEHICLES[0]);
  const [garages, setGarages] = useState([]);
  const [caseNotes, setCaseNotes] = useState([]);
  
  // App States: idle -> uploading -> investigating -> awaiting_evidence -> complete
  const [appState, setAppState] = useState('idle');
  const [sessionId, setSessionId] = useState(null);
  
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

  useEffect(() => {
    // Fetch initial data
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/garages`)
      .then(res => res.json())
      .then(setGarages)
      .catch(console.error);
      
    fetchCaseNotes();
  }, [activeVehicle]);

  const fetchCaseNotes = () => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/case-notes/${activeVehicle.id}`)
      .then(res => res.json())
      .then(data => setCaseNotes(data.notes || []))
      .catch(console.error);
  };

  const handleSseMessage = (event, dataStr) => {
    if (!dataStr) return;
    try {
      const data = JSON.parse(dataStr);
      switch(event) {
        case 'session_start':
          setSessionId(data.sessionId);
          break;
        case 'phase':
          setCurrentPhase(data.phase);
          setEmittedPhases(prev => new Set(prev).add(data.phase));
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
            setAppState('idle');
          }
          break;
      }
    } catch (e) {
      console.error("Failed to parse SSE data", e, dataStr);
    }
  };

  const readSseStream = async (response) => {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    if (!response.body) {
      throw new Error('Streaming response body is missing.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      
      // Last element might be incomplete
      buffer = lines.pop() || '';
      
      for (const block of lines) {
        const parts = block.split('\n');
        let eventName = 'message';
        let dataStr = '';
        
        for (const line of parts) {
          if (line.startsWith('event: ')) {
            eventName = line.substring(7);
          } else if (line.startsWith('data: ')) {
            dataStr = line.substring(6);
          }
        }
        
        if (dataStr) {
          handleSseMessage(eventName, dataStr);
        }
      }
    }
  };

  const startInvestigation = async ({ symptomText, file, previewUrl }) => {
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
    
    const formData = new FormData();
    formData.append('symptomText', symptomText);
    formData.append('vehicleId', activeVehicle.id);
    if (file) formData.append('image', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/investigate`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Investigation failed", error);
      setAppState('idle');
    }
  };

  const submitEvidence = async (file) => {
    if (!sessionId) return;
    
    setAppState('investigating');
    setErrorMessage('');
    setEvidenceImage(URL.createObjectURL(file));
    setEvidenceRequest(null);
    setAnnotations([]);
    
    const formData = new FormData();
    formData.append('vehicleId', activeVehicle.id);
    formData.append('sessionId', sessionId);
    formData.append('image', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/submit-evidence`, {
        method: 'POST',
        body: formData,
      });
      await readSseStream(response);
    } catch (error) {
      console.error("Evidence submission failed", error);
      setAppState('idle');
    }
  };

  const displayImage = evidenceImage || mainImage;

  return (
    <>
      <div className="min-h-screen font-sans p-4 md:p-6 overflow-x-hidden text-[var(--text-primary)]">
        
        <Header 
          activeVehicle={activeVehicle} 
          setActiveVehicle={setActiveVehicle} 
          VEHICLES={VEHICLES} 
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_340px] gap-8 max-w-[1400px] mx-auto">
          
          {/* LEFT PANEL */}
          <div className="flex flex-col gap-6">
            <CaseNotes notes={caseNotes} activeVehicle={activeVehicle} />
          </div>

          {/* CENTER STAGE */}
          <div className="flex flex-col gap-8 min-h-[480px]">
            {errorMessage && (
              <div className="border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded-[var(--radius-md)] font-mono text-sm">
                {errorMessage}
              </div>
            )}

            {(appState === 'idle' || appState === 'uploading') && (
              <UploadZone onSubmit={startInvestigation} isUploading={appState === 'uploading'} />
            )}

            {appState !== 'idle' && appState !== 'uploading' && (
              <div className="flex flex-col gap-8">
                <AnnotatedImage imageUrl={displayImage} annotations={annotations} isProcessing={appState === 'investigating'} />
                
                {appState === 'awaiting_evidence' && evidenceRequest && (
                  <EvidenceRequest request={evidenceRequest} onSubmit={submitEvidence} />
                )}

                {appState === 'complete' && brief && (
                  <DiagnosticBrief brief={brief} garages={garages} />
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="flex flex-col gap-6">
            <BudgetMeter budget={budget} currentPhase={currentPhase} emittedPhases={emittedPhases} isActive={appState !== 'idle'} />
            
            {(appState === 'investigating' || appState === 'awaiting_evidence' || appState === 'complete') && (
              <ThinkingPane thinkingText={thinkingText} isComplete={appState === 'complete'} />
            )}
          </div>

        </div>
      </div>
    </>
  );
}
