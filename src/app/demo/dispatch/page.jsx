'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================
// DEMO DATA
// ============================================

const DEMO_TECHS = [
  {
    id: 1,
    name: 'Miguel R.',
    avatar: '👷',
    status: 'on_site',
    phone: '(555) 123-4567',
    currentJob: 'J-1042',
    vehicle: 'Truck #1',
    location: { lat: 34.0522, lng: -118.2437 }, // LA
    color: '#4CAF50',
    specialty: 'Lawn Care',
    rating: 4.9,
    jobsToday: 4,
  },
  {
    id: 2,
    name: 'Carlos M.',
    avatar: '👷',
    status: 'en_route',
    phone: '(555) 234-5678',
    currentJob: 'J-1043',
    vehicle: 'Truck #2',
    location: { lat: 34.0622, lng: -118.2537 },
    color: '#2196F3',
    specialty: 'Hedge Trimming',
    rating: 4.8,
    jobsToday: 3,
  },
  {
    id: 3,
    name: 'David L.',
    avatar: '👷',
    status: 'available',
    phone: '(555) 345-6789',
    currentJob: null,
    vehicle: 'Van #1',
    location: { lat: 34.0422, lng: -118.2337 },
    color: '#9C27B0',
    specialty: 'Tree Service',
    rating: 4.7,
    jobsToday: 2,
  },
  {
    id: 4,
    name: 'James K.',
    avatar: '👷',
    status: 'on_site',
    phone: '(555) 456-7890',
    currentJob: 'J-1044',
    vehicle: 'Truck #3',
    location: { lat: 34.0722, lng: -118.2637 },
    color: '#FF9800',
    specialty: 'Irrigation',
    rating: 4.9,
    jobsToday: 3,
  },
  {
    id: 5,
    name: 'Marcus T.',
    avatar: '👷',
    status: 'en_route',
    phone: '(555) 567-8901',
    currentJob: 'J-1048',
    vehicle: 'Truck #4',
    location: { lat: 34.0822, lng: -118.2237 },
    color: '#E91E63',
    specialty: 'Hardscaping',
    rating: 4.6,
    jobsToday: 2,
  },
  {
    id: 6,
    name: 'Tony V.',
    avatar: '👷',
    status: 'available',
    phone: '(555) 678-9012',
    currentJob: null,
    vehicle: 'Van #2',
    location: { lat: 34.0322, lng: -118.2837 },
    color: '#00BCD4',
    specialty: 'Lawn Care',
    rating: 4.8,
    jobsToday: 3,
  },
  {
    id: 7,
    name: 'Ricardo S.',
    avatar: '👷',
    status: 'on_site',
    phone: '(555) 789-0123',
    currentJob: 'J-1049',
    vehicle: 'Truck #5',
    location: { lat: 34.0922, lng: -118.2137 },
    color: '#8BC34A',
    specialty: 'Pest Control',
    rating: 4.7,
    jobsToday: 4,
  },
  {
    id: 8,
    name: 'Andre W.',
    avatar: '👷',
    status: 'available',
    phone: '(555) 890-1234',
    currentJob: null,
    vehicle: 'Van #3',
    location: { lat: 34.0222, lng: -118.2937 },
    color: '#607D8B',
    specialty: 'General Maintenance',
    rating: 4.5,
    jobsToday: 2,
  },
];

const DEMO_JOBS = [
  {
    id: 'J-1042',
    customer: 'Maria Santos',
    address: '1234 Oak Street, Los Angeles',
    service: 'Weekly Lawn Care',
    time: '8:00 AM',
    duration: '1.5 hrs',
    status: 'in_progress',
    techId: 1,
    price: '$85',
    notes: 'Gate code: 1234',
  },
  {
    id: 'J-1043',
    customer: 'Robert Chen',
    address: '567 Pine Ave, Pasadena',
    service: 'Hedge Trimming + Cleanup',
    time: '10:00 AM',
    duration: '2 hrs',
    status: 'en_route',
    techId: 2,
    price: '$150',
    notes: 'Dog in backyard - friendly',
  },
  {
    id: 'J-1044',
    customer: 'Jennifer Walsh',
    address: '890 Maple Dr, Glendale',
    service: 'Sprinkler Repair',
    time: '9:30 AM',
    duration: '1 hr',
    status: 'in_progress',
    techId: 4,
    price: '$120',
    notes: 'Zone 3 not working',
  },
  {
    id: 'J-1045',
    customer: 'Mike Thompson',
    address: '234 Cedar Ln, Burbank',
    service: 'Full Yard Cleanup',
    time: '1:00 PM',
    duration: '3 hrs',
    status: 'scheduled',
    techId: null,
    price: '$275',
    notes: 'Large property, bring extra bags',
  },
  {
    id: 'J-1046',
    customer: 'Sarah Miller',
    address: '456 Elm St, Studio City',
    service: 'Tree Trimming',
    time: '2:30 PM',
    duration: '2 hrs',
    status: 'scheduled',
    techId: 3,
    price: '$200',
    notes: 'Front yard oak tree only',
  },
  {
    id: 'J-1047',
    customer: 'Tom Bradley',
    address: '789 Birch Rd, Sherman Oaks',
    service: 'Weekly Lawn Care',
    time: '4:00 PM',
    duration: '1 hr',
    status: 'scheduled',
    techId: null,
    price: '$65',
    notes: '',
  },
  {
    id: 'J-1048',
    customer: 'Linda Garcia',
    address: '321 Willow Way, Encino',
    service: 'Patio Installation',
    time: '9:00 AM',
    duration: '4 hrs',
    status: 'en_route',
    techId: 5,
    price: '$450',
    notes: 'Pavers already delivered on-site',
  },
  {
    id: 'J-1049',
    customer: 'Kevin Park',
    address: '654 Sycamore St, North Hollywood',
    service: 'Pest Treatment - Lawn',
    time: '8:30 AM',
    duration: '1 hr',
    status: 'in_progress',
    techId: 7,
    price: '$95',
    notes: 'Grub infestation, pets inside during treatment',
  },
  {
    id: 'J-1050',
    customer: 'Amanda Foster',
    address: '987 Redwood Ct, Culver City',
    service: 'Bi-Weekly Lawn Care',
    time: '11:30 AM',
    duration: '1.5 hrs',
    status: 'scheduled',
    techId: 6,
    price: '$75',
    notes: 'Enter through side gate',
  },
  {
    id: 'J-1051',
    customer: 'Daniel Kim',
    address: '159 Magnolia Blvd, Toluca Lake',
    service: 'Drip System Install',
    time: '2:00 PM',
    duration: '3 hrs',
    status: 'scheduled',
    techId: 4,
    price: '$380',
    notes: 'Garden beds only, homeowner providing plants',
  },
  {
    id: 'J-1052',
    customer: 'Patricia Nguyen',
    address: '753 Acacia Dr, Pasadena',
    service: 'Bush Removal + Mulching',
    time: '3:00 PM',
    duration: '2.5 hrs',
    status: 'scheduled',
    techId: null,
    price: '$225',
    notes: '3 dead bushes in front yard, replace with mulch',
  },
  {
    id: 'J-1053',
    customer: 'Steven Wright',
    address: '246 Poplar Ln, Glendale',
    service: 'Emergency Tree Branch',
    time: '11:00 AM',
    duration: '1.5 hrs',
    status: 'scheduled',
    techId: 3,
    price: '$175',
    notes: 'Branch fell on fence, needs removal ASAP',
  },
];

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: '#9E9E9E', bg: '#F5F5F5' },
  en_route: { label: 'En Route', color: '#2196F3', bg: '#E3F2FD' },
  in_progress: { label: 'On Site', color: '#4CAF50', bg: '#E8F5E9' },
  completed: { label: 'Complete', color: '#673AB7', bg: '#EDE7F6' },
  delayed: { label: 'Running Late', color: '#F44336', bg: '#FFEBEE' },
};

// ============================================
// COMPONENT
// ============================================

export default function DispatchBoardPage() {
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [techs, setTechs] = useState(DEMO_TECHS);
  const [selectedTech, setSelectedTech] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'timeline'
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [draggedJob, setDraggedJob] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTechs(prev => prev.map(tech => ({
        ...tech,
        location: {
          lat: tech.location.lat + (Math.random() - 0.5) * 0.001,
          lng: tech.location.lng + (Math.random() - 0.5) * 0.001,
        }
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleAssignJob = (jobId, techId) => {
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, techId, status: techId ? 'scheduled' : job.status } : job
    ));
    showToast(`Job ${jobId} assigned to ${techs.find(t => t.id === techId)?.name}`);
    setShowAssignModal(false);
    setSelectedJob(null);
  };

  const handleStatusChange = (jobId, newStatus) => {
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, status: newStatus } : job
    ));
    showToast(`Job ${jobId} marked as ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleSendRunningLate = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    showToast(`"Running late" SMS sent to ${job?.customer}`);
    handleStatusChange(jobId, 'delayed');
  };

  const handleDragStart = (e, job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, techId) => {
    e.preventDefault();
    if (draggedJob) {
      handleAssignJob(draggedJob.id, techId);
      setDraggedJob(null);
    }
  };

  const unassignedJobs = jobs.filter(j => !j.techId);
  const assignedJobs = jobs.filter(j => j.techId);

  return (
    <div className="dispatch-page">
      {/* Demo Banner */}
      <div style={{ background: 'linear-gradient(90deg, #f5a623, #e6991a)', padding: '12px 20px', textAlign: 'center', color: '#1a1a2e', fontWeight: 600, fontSize: '0.9375rem' }}>
        🎯 This is an interactive demo — <Link href="/auth/signup?plan=elite" style={{ textDecoration: 'underline', color: '#1a1a2e' }}>Get Elite Plan</Link> for full access
      </div>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <Link href="/" className="back-link">← Back to Home</Link>
          <h1>Dispatch Board</h1>
          <span className="elite-badge">Elite Feature</span>
        </div>
        <div className="header-right">
          <div className="current-time">
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
            <button
              className={viewMode === 'timeline' ? 'active' : ''}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
          </div>
        </div>
      </header>

      <div className="dispatch-layout">
        {/* Left Panel - Tech List */}
        <aside className="tech-panel">
          <div className="panel-header">
            <h2>Crew ({techs.length})</h2>
            <div className="status-summary">
              <span className="status-dot on-site"></span> {techs.filter(t => t.status === 'on_site').length} On Site
              <span className="status-dot en-route"></span> {techs.filter(t => t.status === 'en_route').length} En Route
              <span className="status-dot available"></span> {techs.filter(t => t.status === 'available').length} Available
            </div>
          </div>

          <div className="tech-list">
            {techs.map(tech => (
              <div
                key={tech.id}
                className={`tech-card ${selectedTech?.id === tech.id ? 'selected' : ''} ${tech.status}`}
                onClick={() => setSelectedTech(tech)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tech.id)}
              >
                <div className="tech-avatar" style={{ borderColor: tech.color }}>
                  {tech.avatar}
                </div>
                <div className="tech-info">
                  <h4>{tech.name}</h4>
                  <p className="tech-vehicle">{tech.vehicle} • {tech.specialty}</p>
                  <span className={`tech-status ${tech.status}`}>
                    {tech.status === 'on_site' && 'On Site'}
                    {tech.status === 'en_route' && 'En Route'}
                    {tech.status === 'available' && 'Available'}
                  </span>
                </div>
                <div className="tech-actions">
                  <button className="icon-btn" title="Call">📞</button>
                  <button className="icon-btn" title="Message">💬</button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content - Map or Timeline */}
        <main className="main-content">
          {viewMode === 'map' ? (
            <div className="map-view">
              <div className="map-container">
                {/* Simulated map background */}
                <div className="map-placeholder">
                  <div className="map-grid"></div>

                  {/* Tech markers */}
                  {techs.map((tech, i) => (
                    <div
                      key={tech.id}
                      className={`map-marker ${tech.status} ${selectedTech?.id === tech.id ? 'selected' : ''}`}
                      style={{
                        left: `${10 + (i % 4) * 22}%`,
                        top: `${20 + Math.floor(i / 4) * 35}%`,
                        backgroundColor: tech.color
                      }}
                      onClick={() => setSelectedTech(tech)}
                    >
                      <span className="marker-icon">🚛</span>
                      <span className="marker-label">{tech.name.split(' ')[0]}</span>
                      {tech.status === 'en_route' && (
                        <span className="marker-pulse"></span>
                      )}
                    </div>
                  ))}

                  {/* Job location markers */}
                  {jobs.filter(j => j.status !== 'completed').map((job, i) => (
                    <div
                      key={job.id}
                      className="job-marker"
                      style={{
                        left: `${12 + (i % 6) * 14}%`,
                        top: `${50 + Math.floor(i / 6) * 20}%`
                      }}
                      onClick={() => setSelectedJob(job)}
                    >
                      <span className="job-marker-icon">📍</span>
                    </div>
                  ))}

                  {/* Map overlay info */}
                  <div className="map-overlay">
                    <p>📍 Los Angeles Area</p>
                    <p className="update-time">Live • Updated just now</p>
                  </div>
                </div>
              </div>

              {/* Selected tech/job detail */}
              {(selectedTech || selectedJob) && (
                <div className="detail-card">
                  {selectedTech && !selectedJob && (
                    <>
                      <div className="detail-header">
                        <span className="detail-avatar" style={{ borderColor: selectedTech.color }}>
                          {selectedTech.avatar}
                        </span>
                        <div>
                          <h3>{selectedTech.name}</h3>
                          <p>{selectedTech.vehicle} • {selectedTech.phone}</p>
                        </div>
                        <button className="close-btn" onClick={() => setSelectedTech(null)}>✕</button>
                      </div>
                      <div className="detail-body">
                        <p className={`status-badge ${selectedTech.status}`}>
                          {selectedTech.status === 'on_site' && 'Currently On Site'}
                          {selectedTech.status === 'en_route' && 'Driving to Job'}
                          {selectedTech.status === 'available' && 'Available for Assignment'}
                        </p>
                        <div className="tech-stats">
                          <span>⭐ {selectedTech.rating} rating</span>
                          <span>📋 {selectedTech.jobsToday} jobs today</span>
                          <span>🔧 {selectedTech.specialty}</span>
                        </div>
                        {selectedTech.currentJob && (
                          <div className="current-job">
                            <strong>Current Job:</strong> {selectedTech.currentJob}
                            <br />
                            {jobs.find(j => j.id === selectedTech.currentJob)?.customer}
                          </div>
                        )}
                        <div className="detail-actions">
                          <button className="btn-primary">📞 Call</button>
                          <button className="btn-secondary">💬 Message</button>
                          <button className="btn-secondary">📋 View Schedule</button>
                        </div>
                      </div>
                    </>
                  )}
                  {selectedJob && (
                    <>
                      <div className="detail-header">
                        <span className="detail-icon">📋</span>
                        <div>
                          <h3>{selectedJob.id} - {selectedJob.service}</h3>
                          <p>{selectedJob.customer}</p>
                        </div>
                        <button className="close-btn" onClick={() => setSelectedJob(null)}>✕</button>
                      </div>
                      <div className="detail-body">
                        <p className={`status-badge ${selectedJob.status}`}>
                          {STATUS_CONFIG[selectedJob.status]?.label}
                        </p>
                        <div className="job-details">
                          <p>📍 {selectedJob.address}</p>
                          <p>🕐 {selectedJob.time} ({selectedJob.duration})</p>
                          <p>💰 {selectedJob.price}</p>
                          {selectedJob.notes && <p>📝 {selectedJob.notes}</p>}
                        </div>
                        <div className="detail-actions">
                          {selectedJob.status === 'scheduled' && (
                            <button
                              className="btn-primary"
                              onClick={() => handleStatusChange(selectedJob.id, 'en_route')}
                            >
                              Mark En Route
                            </button>
                          )}
                          {selectedJob.status === 'en_route' && (
                            <>
                              <button
                                className="btn-primary"
                                onClick={() => handleStatusChange(selectedJob.id, 'in_progress')}
                              >
                                Arrived On Site
                              </button>
                              <button
                                className="btn-warning"
                                onClick={() => handleSendRunningLate(selectedJob.id)}
                              >
                                Running Late
                              </button>
                            </>
                          )}
                          {selectedJob.status === 'in_progress' && (
                            <button
                              className="btn-success"
                              onClick={() => handleStatusChange(selectedJob.id, 'completed')}
                            >
                              Mark Complete
                            </button>
                          )}
                          {!selectedJob.techId && (
                            <button
                              className="btn-primary"
                              onClick={() => setShowAssignModal(true)}
                            >
                              Assign Tech
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="timeline-view">
              <div className="timeline-header">
                <div className="timeline-tech-col">Tech</div>
                {['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'].map(time => (
                  <div key={time} className="timeline-hour">{time}</div>
                ))}
              </div>

              {techs.map(tech => {
                const techJobs = jobs.filter(j => j.techId === tech.id);
                return (
                  <div
                    key={tech.id}
                    className="timeline-row"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tech.id)}
                  >
                    <div className="timeline-tech-info">
                      <span className="tech-dot" style={{ backgroundColor: tech.color }}></span>
                      {tech.name}
                    </div>
                    <div className="timeline-jobs">
                      {techJobs.map(job => {
                        const startHour = parseInt(job.time.split(':')[0]);
                        const isPM = job.time.includes('PM') && startHour !== 12;
                        const hour24 = isPM ? startHour + 12 : startHour;
                        const left = ((hour24 - 8) / 10) * 100;
                        const width = (parseFloat(job.duration) / 10) * 100;

                        return (
                          <div
                            key={job.id}
                            className={`timeline-job ${job.status}`}
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 8)}%`,
                              backgroundColor: STATUS_CONFIG[job.status]?.bg,
                              borderLeftColor: STATUS_CONFIG[job.status]?.color,
                            }}
                            onClick={() => setSelectedJob(job)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, job)}
                          >
                            <span className="job-title">{job.customer}</span>
                            <span className="job-service">{job.service}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Current time indicator */}
              <div
                className="time-indicator"
                style={{ left: `${((currentTime.getHours() - 8) / 10) * 100 + 10}%` }}
              >
                <span className="time-line"></span>
                <span className="time-now">NOW</span>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel - Job Queue */}
        <aside className="job-panel">
          <div className="panel-header">
            <h2>Today&apos;s Jobs ({jobs.length})</h2>
          </div>

          {/* Unassigned Jobs */}
          {unassignedJobs.length > 0 && (
            <div className="job-section">
              <h3 className="section-title warning">
                Unassigned ({unassignedJobs.length})
              </h3>
              {unassignedJobs.map(job => (
                <div
                  key={job.id}
                  className="job-card unassigned"
                  draggable
                  onDragStart={(e) => handleDragStart(e, job)}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="job-header">
                    <span className="job-id">{job.id}</span>
                    <span className="job-time">{job.time}</span>
                  </div>
                  <h4>{job.customer}</h4>
                  <p className="job-service">{job.service}</p>
                  <p className="job-address">📍 {job.address}</p>
                  <div className="job-footer">
                    <span className="job-price">{job.price}</span>
                    <button
                      className="assign-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setShowAssignModal(true);
                      }}
                    >
                      + Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assigned Jobs */}
          <div className="job-section">
            <h3 className="section-title">Scheduled ({assignedJobs.length})</h3>
            {assignedJobs.map(job => {
              const tech = techs.find(t => t.id === job.techId);
              return (
                <div
                  key={job.id}
                  className={`job-card ${job.status}`}
                  onClick={() => setSelectedJob(job)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, job)}
                >
                  <div className="job-header">
                    <span className="job-id">{job.id}</span>
                    <span
                      className="job-status"
                      style={{
                        backgroundColor: STATUS_CONFIG[job.status]?.bg,
                        color: STATUS_CONFIG[job.status]?.color
                      }}
                    >
                      {STATUS_CONFIG[job.status]?.label}
                    </span>
                  </div>
                  <h4>{job.customer}</h4>
                  <p className="job-service">{job.service}</p>
                  <div className="job-meta">
                    <span>🕐 {job.time}</span>
                    <span style={{ color: tech?.color }}>{tech?.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Job {selectedJob.id}</h3>
            <p>{selectedJob.service} • {selectedJob.customer}</p>
            <div className="modal-techs">
              {techs.map(tech => (
                <button
                  key={tech.id}
                  className={`modal-tech ${tech.status}`}
                  onClick={() => handleAssignJob(selectedJob.id, tech.id)}
                >
                  <span style={{ borderColor: tech.color }}>{tech.avatar}</span>
                  <div>
                    <strong>{tech.name}</strong>
                    <span className="tech-status-small">
                      {tech.status === 'available' ? 'Available' :
                       tech.status === 'en_route' ? 'En Route' : 'On Site'}
                      {' • '}{tech.specialty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button className="modal-close" onClick={() => setShowAssignModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showNotification && (
        <div className="toast">
          {notificationMessage}
        </div>
      )}

      {/* Upgrade CTA for non-Elite users */}
      <div className="upgrade-banner">
        <div className="banner-content">
          <span className="banner-icon">🚀</span>
          <div>
            <strong>This is a demo of the Elite Dispatch Board</strong>
            <p>Upgrade to Elite to manage multiple crews in real-time</p>
          </div>
          <Link href="/pricing" className="banner-cta">
            Upgrade to Elite →
          </Link>
        </div>
      </div>

      <style jsx>{`
        /* ============================================
           DISPATCH BOARD STYLES
           ============================================ */

        .dispatch-page {
          --navy: #1a1a2e;
          --navy-light: #2d2d44;
          --gold: #f5a623;
          --gold-light: #ffd380;
          --success: #4CAF50;
          --warning: #FF9800;
          --danger: #F44336;
          --info: #2196F3;
          --gray-100: #f5f5f5;
          --gray-200: #eeeeee;
          --gray-300: #e0e0e0;
          --gray-600: #757575;

          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--gray-100);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ============ HEADER ============ */
        .header {
          background: var(--navy);
          color: white;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-link {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.9rem;
        }

        .back-link:hover {
          color: var(--gold);
        }

        .header h1 {
          font-size: 1.5rem;
          margin: 0;
          font-weight: 700;
        }

        .elite-badge {
          background: linear-gradient(135deg, var(--gold), var(--gold-light));
          color: var(--navy);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .current-time {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--gold);
        }

        .view-toggle {
          display: flex;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .view-toggle button {
          background: none;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .view-toggle button.active {
          background: var(--gold);
          color: var(--navy);
        }

        /* ============ LAYOUT ============ */
        .dispatch-layout {
          display: grid;
          grid-template-columns: 280px 1fr 320px;
          flex: 1;
          overflow: hidden;
        }

        /* ============ TECH PANEL ============ */
        .tech-panel, .job-panel {
          background: white;
          border-right: 1px solid var(--gray-200);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .job-panel {
          border-right: none;
          border-left: 1px solid var(--gray-200);
        }

        .panel-header {
          padding: 1rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .panel-header h2 {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          color: var(--navy);
        }

        .status-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--gray-600);
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }

        .status-dot.on-site { background: var(--success); }
        .status-dot.en-route { background: var(--info); }
        .status-dot.available { background: var(--gray-300); }

        .tech-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .tech-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 10px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .tech-card:hover {
          background: var(--gray-100);
        }

        .tech-card.selected {
          border-color: var(--gold);
          background: rgba(245,166,35,0.05);
        }

        .tech-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: var(--gray-100);
          border: 3px solid;
        }

        .tech-info {
          flex: 1;
          min-width: 0;
        }

        .tech-info h4 {
          margin: 0;
          font-size: 0.95rem;
          color: var(--navy);
        }

        .tech-vehicle {
          margin: 0;
          font-size: 0.8rem;
          color: var(--gray-600);
        }

        .tech-status {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .tech-status.on_site { color: var(--success); }
        .tech-status.en_route { color: var(--info); }
        .tech-status.available { color: var(--gray-600); }

        .tech-actions {
          display: flex;
          gap: 0.25rem;
        }

        .icon-btn {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .icon-btn:hover {
          opacity: 1;
        }

        /* ============ MAIN CONTENT ============ */
        .main-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        /* Map View */
        .map-view {
          height: 100%;
          position: relative;
        }

        .map-container {
          height: 100%;
        }

        .map-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #e8f4e8 0%, #d4e8d4 100%);
          position: relative;
          overflow: hidden;
        }

        .map-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .map-marker {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          z-index: 10;
        }

        .map-marker:hover, .map-marker.selected {
          transform: scale(1.15);
          z-index: 20;
        }

        .marker-icon {
          font-size: 2rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .marker-label {
          background: white;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          margin-top: 0.25rem;
        }

        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(33, 150, 243, 0.3);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }

        .job-marker {
          position: absolute;
          cursor: pointer;
          font-size: 1.5rem;
          transition: transform 0.2s;
        }

        .job-marker:hover {
          transform: scale(1.2);
        }

        .map-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .map-overlay p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--navy);
        }

        .update-time {
          color: var(--success) !important;
          font-size: 0.75rem !important;
        }

        /* Detail Card */
        .detail-card {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          max-width: 400px;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .detail-avatar, .detail-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: var(--gray-100);
          border: 3px solid;
        }

        .detail-icon {
          border: none;
          font-size: 2rem;
        }

        .detail-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .detail-header p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--gray-600);
        }

        .close-btn {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          opacity: 0.5;
        }

        .close-btn:hover {
          opacity: 1;
        }

        .detail-body {
          padding: 1rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .status-badge.on_site, .status-badge.in_progress {
          background: #E8F5E9;
          color: var(--success);
        }

        .status-badge.en_route {
          background: #E3F2FD;
          color: var(--info);
        }

        .status-badge.available, .status-badge.scheduled {
          background: var(--gray-100);
          color: var(--gray-600);
        }

        .status-badge.delayed {
          background: #FFEBEE;
          color: var(--danger);
        }

        .tech-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.85rem;
          margin-bottom: 1rem;
          color: var(--gray-600);
        }

        .current-job, .job-details {
          background: var(--gray-100);
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .job-details p {
          margin: 0.25rem 0;
        }

        .detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .btn-primary, .btn-secondary, .btn-success, .btn-warning {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--navy);
          color: white;
        }

        .btn-secondary {
          background: var(--gray-200);
          color: var(--navy);
        }

        .btn-success {
          background: var(--success);
          color: white;
        }

        .btn-warning {
          background: var(--warning);
          color: white;
        }

        /* Timeline View */
        .timeline-view {
          height: 100%;
          overflow: auto;
          padding: 1rem;
          position: relative;
        }

        .timeline-header {
          display: flex;
          border-bottom: 2px solid var(--gray-300);
          padding-bottom: 0.5rem;
          margin-bottom: 0.5rem;
          position: sticky;
          top: 0;
          background: var(--gray-100);
          z-index: 5;
        }

        .timeline-tech-col {
          width: 100px;
          flex-shrink: 0;
          font-weight: 600;
          color: var(--navy);
        }

        .timeline-hour {
          flex: 1;
          text-align: center;
          font-size: 0.8rem;
          color: var(--gray-600);
        }

        .timeline-row {
          display: flex;
          min-height: 60px;
          border-bottom: 1px solid var(--gray-200);
          position: relative;
        }

        .timeline-tech-info {
          width: 100px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .tech-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .timeline-jobs {
          flex: 1;
          position: relative;
        }

        .timeline-job {
          position: absolute;
          top: 8px;
          bottom: 8px;
          border-radius: 6px;
          padding: 0.4rem 0.6rem;
          font-size: 0.75rem;
          border-left: 4px solid;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s;
        }

        .timeline-job:hover {
          transform: scale(1.02);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10;
        }

        .job-title {
          display: block;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .job-service {
          display: block;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time-indicator {
          position: absolute;
          top: 40px;
          bottom: 0;
          width: 2px;
          z-index: 20;
        }

        .time-line {
          display: block;
          width: 2px;
          height: 100%;
          background: var(--danger);
        }

        .time-now {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--danger);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 3px;
        }

        /* ============ JOB PANEL ============ */
        .job-section {
          padding: 0.5rem;
          overflow-y: auto;
        }

        .section-title {
          font-size: 0.85rem;
          color: var(--gray-600);
          margin: 0.5rem 0;
          padding: 0 0.5rem;
        }

        .section-title.warning {
          color: var(--warning);
        }

        .job-card {
          background: white;
          border-radius: 10px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border: 1px solid var(--gray-200);
          cursor: pointer;
          transition: all 0.2s;
        }

        .job-card:hover {
          border-color: var(--gold);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .job-card.unassigned {
          border-left: 4px solid var(--warning);
          background: #FFF8E1;
        }

        .job-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .job-id {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gray-600);
        }

        .job-time {
          font-size: 0.8rem;
          color: var(--navy);
          font-weight: 600;
        }

        .job-status {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .job-card h4 {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          color: var(--navy);
        }

        .job-card .job-service {
          margin: 0 0 0.25rem;
          font-size: 0.8rem;
          color: var(--gray-600);
        }

        .job-address {
          margin: 0 0 0.5rem;
          font-size: 0.8rem;
          color: var(--gray-600);
        }

        .job-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .job-price {
          font-weight: 700;
          color: var(--success);
        }

        .assign-btn {
          background: var(--gold);
          color: var(--navy);
          border: none;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .job-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        /* ============ MODAL ============ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          width: 90%;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal h3 {
          margin: 0 0 0.25rem;
          color: var(--navy);
        }

        .modal > p {
          margin: 0 0 1rem;
          color: var(--gray-600);
        }

        .modal-techs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .modal-tech {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 2px solid var(--gray-200);
          border-radius: 10px;
          background: white;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .modal-tech:hover {
          border-color: var(--gold);
        }

        .modal-tech span:first-child {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          background: var(--gray-100);
          border: 3px solid;
        }

        .modal-tech strong {
          display: block;
        }

        .tech-status-small {
          font-size: 0.75rem;
          color: var(--gray-600);
        }

        .modal-close {
          width: 100%;
          padding: 0.75rem;
          background: var(--gray-200);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ============ TOAST ============ */
        .toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--navy);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.9rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 200;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        /* ============ UPGRADE BANNER ============ */
        .upgrade-banner {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
          color: white;
          padding: 1rem;
        }

        .banner-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .banner-icon {
          font-size: 2rem;
        }

        .banner-content > div {
          flex: 1;
        }

        .banner-content strong {
          display: block;
        }

        .banner-content p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .banner-cta {
          background: var(--gold);
          color: var(--navy);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s;
        }

        .banner-cta:hover {
          background: var(--gold-light);
        }

        /* ============ RESPONSIVE ============ */
        @media (max-width: 1024px) {
          .dispatch-layout {
            grid-template-columns: 1fr;
          }

          .tech-panel, .job-panel {
            display: none;
          }

          .header {
            flex-direction: column;
            text-align: center;
          }

          .detail-card {
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
