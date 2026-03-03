import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Shield, Bell, History, Camera, AlertTriangle } from 'lucide-react';
import './App.css';

interface DetectionRecord {
  id: number;
  timestamp: string;
  status: string;
  confidence: number;
}

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [isFallDetected, setIsFallDetected] = useState<boolean>(false);
  const [records, setRecords] = useState<DetectionRecord[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  // Fetch detection records from backend
  const fetchRecords = async () => {
    try {
      const response = await axios.get('http://localhost:8000/records');
      setRecords(response.data);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000); // Update records every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const [currentStreak, setCurrentStreak] = useState<number>(0);

  const isProcessing = useRef(false);

  // Send frames to backend for detection
  const captureAndDetect = useCallback(async () => {
    // Optimization: Skip capture if a frame is already being processed
    // This prevents "clogging" the network if inference takes > 200ms
    if (!isMonitoring || !webcamRef.current || isProcessing.current) return;

    isProcessing.current = true;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      isProcessing.current = false;
      return;
    }

    try {
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      const response = await axios.post('http://localhost:8000/detect', formData);
      setCurrentStreak(response.data.current_streak);
      
      if (response.data.confirmed_fall) {
        setIsFallDetected(true);
        setLastAlert(new Date().toLocaleTimeString());
        setTimeout(() => setIsFallDetected(false), 5000);
      }
    } catch (error) {
      console.error("Async detection error:", error);
    } finally {
      isProcessing.current = false;
    }
  }, [isMonitoring]);

  useEffect(() => {
    let interval: any;
    if (isMonitoring) {
      // Faster polling: Every 150ms to ensure near real-time tracking
      interval = setInterval(captureAndDetect, 150);
    }
    return () => clearInterval(interval);
  }, [isMonitoring, captureAndDetect]);

  return (
    <div className="dashboard">
      <header className="navbar">
        <div className="logo">
          <Shield color="#3b82f6" size={32} />
          <h1>SafeGuard AI</h1>
        </div>
        <div className="admin-status">
          <Bell className={isFallDetected ? 'pulse-alert' : ''} color={isFallDetected ? '#ef4444' : '#64748b'} />
          <span>Admin Panel</span>
        </div>
      </header>

      <main className="main-content">
        <div className="video-section">
          <div className="card camera-card">
            <div className="card-header">
              <Camera size={20} />
              <h3>Live Feed</h3>
              <div className={`status-badge ${isMonitoring ? 'monitoring' : 'idle'}`}>
                {isMonitoring ? `Monitoring Active (Streak: ${currentStreak}/10)` : 'System Idle'}
              </div>
            </div>
            <div className="camera-container">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="webcam-view"
              />
              {currentStreak > 0 && currentStreak < 10 && (
                <div className="warning-overlay">
                  <p>Analyzing Potential Fall... ({currentStreak}/10)</p>
                </div>
              )}
              {isFallDetected && (
                <div className="fall-overlay">
                  <AlertTriangle size={64} color="#ef4444" />
                  <h2>FALL DETECTED!</h2>
                  <p>Sending alert to emergency contacts...</p>
                </div>
              )}
            </div>
            <div className="controls">
              <button 
                className={`btn ${isMonitoring ? 'btn-stop' : 'btn-start'}`}
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="card history-card">
            <div className="card-header">
              <History size={20} />
              <h3>Detection History</h3>
            </div>
            <div className="history-list">
              {records.length > 0 ? records.map(record => (
                <div key={record.id} className="history-item">
                  <div className="record-time">{new Date(record.timestamp).toLocaleString()}</div>
                  <div className="record-status text-red">{record.status}</div>
                  <div className="record-confidence">Confidence: {record.confidence}%</div>
                </div>
              )) : <div className="no-records">No falls detected yet.</div>}
            </div>
          </div>
          
          <div className="card alert-card">
            <h3>Recent Alert</h3>
            <div className="alert-box">
              {lastAlert ? (
                <>
                  <p className="alert-msg">Last Fall Detected at:</p>
                  <p className="alert-time">{lastAlert}</p>
                </>
              ) : (
                <p className="alert-msg">No recent alerts.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
