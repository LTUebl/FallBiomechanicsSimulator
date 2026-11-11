/**
 * ============================================================================
 * LTU Experimental Biomechanics Lab · MSU Forensic Anthropology
 * Interactive Multi-Body Dynamics (MBD) Human Fall & Skeletal Fracture Simulator
 * 
 * app.js - Full Application Orchestrator, Sequential Workflow Controller,
 *          2D Articulated Multi-Body Canvas Renderers, Chart.js Visualizations,
 *          Interactive Trauma Heat-Map, Parametric Sweep & WebM Video Exporter
 * ============================================================================
 */

(function () {
  'use strict';

  // Ensure physics engine is available
  const Physics = window.EBLFallPhysics;
  if (!Physics) {
    console.error('EBLFallPhysics engine is not loaded! Please verify physics.js is included before app.js.');
    return;
  }

  // ==========================================================================
  // 1. APPLICATION STATE
  // ==========================================================================
  const state = {
    // Current input parameters
    params: {
      height: 5.0,
      angleDeg: 15,
      vx: 1.2,
      vy: 0.0,
      omegaRad: 1.0,
      omegaDeg: 57.3,
      bracing: 0.50,
      mass: 75,
      stature: 1.75,
      stiffness: 2500, // in kN/m units for physics.js
      damping: 55,     // calibrated damping factor
      restitution: 0.25,
      tolerance: 1.00,
      surface: 'asphalt'
    },

    // Simulation calculation results
    simResult: null,
    sweepResult: null,
    isDirty: true,
    isSweepDirty: true,

    // Active tab: 'setup' | 'simulate' | 'analysis' | 'sweep'
    activeTab: 'setup',

    // Tab 2 Simulation Playback State
    playback: {
      isPlaying: false,
      currentFrame: 0,
      simTime: 0,
      userScrubbed: false,
      isSlowMoActive: false,
      keyframeIndices: [0, 0, 0, 0, 0],
      speed: 1.0,
      lastTimestamp: 0,
      animId: null,
      cameraMode: 'follow', // 'follow' | 'fixed' | 'ground'
      panOffset: { x: 0, y: 0 },
      zoomScale: 1.0,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    },

    // Tab 1 Setup Preview Canvas View State
    setupView: {
      panOffset: { x: 0, y: 0 },
      zoomScale: 1.0,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      mode: 'sagittal' // 'sagittal' | 'fit'
    },

    // Tab 3 Trauma Map Canvas View State
    injuryView: {
      panOffset: { x: 0, y: 0 },
      zoomScale: 1.0,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      hoveredSegment: null,
      selectedSegment: null,
      hitRegions: []
    },

    // Video Recording State
    recording: {
      isRecording: false,
      mediaRecorder: null,
      chunks: []
    },

    // Chart.js Instances
    charts: {
      grf: null,
      segments: null,
      headSpine: null,
      energy: null,
      bimodalRisk: null,
      bimodalAngle: null
    }
  };

  // Preset dictionary mapping preset keys to exact parameters
  const PRESETS = {
    trip: {
      height: 0.8,
      angleDeg: 25,
      vx: 1.6,
      vy: 0.0,
      omegaRad: 2.0,
      bracing: 0.70,
      mass: 75,
      stature: 1.75,
      stiffness: 2500,
      restitution: 0.25,
      tolerance: 1.00
    },
    ladder: {
      height: 4.5,
      angleDeg: 5,
      vx: 0.4,
      vy: 0.0,
      omegaRad: 0.2,
      bracing: 0.50,
      mass: 80,
      stature: 1.78,
      stiffness: 5000,
      restitution: 0.45,
      tolerance: 1.00
    },
    stairs: {
      height: 2.8,
      angleDeg: 40,
      vx: 1.2,
      vy: -0.4,
      omegaRad: 3.0,
      bracing: 0.40,
      mass: 72,
      stature: 1.70,
      stiffness: 1000,
      restitution: 0.35,
      tolerance: 0.90
    },
    roof: {
      height: 6.5,
      angleDeg: -25,
      vx: -0.8,
      vy: 0.0,
      omegaRad: -1.5,
      bracing: 0.25,
      mass: 75,
      stature: 1.75,
      stiffness: 2500,
      restitution: 0.25,
      tolerance: 1.00
    },
    balcony: {
      height: 12.0,
      angleDeg: 12,
      vx: 2.5,
      vy: 0.2,
      omegaRad: 0.8,
      bracing: 0.30,
      mass: 78,
      stature: 1.80,
      stiffness: 5000,
      restitution: 0.45,
      tolerance: 1.00
    },
    suicide: {
      height: 18.0,
      angleDeg: -135,
      vx: 1.0,
      vy: -1.0,
      omegaRad: 0.4,
      bracing: 0.10,
      mass: 70,
      stature: 1.72,
      stiffness: 5000,
      restitution: 0.45,
      tolerance: 1.00
    }
  };

  // Color constants for high-clarity scientific styling
  const COLORS = {
    safe: '#10b981',       // Intact emerald
    safeBg: '#dcfce7',
    micro: '#f59e0b',      // Microdamage amber
    microBg: '#fef3c7',
    fracture: '#ef4444',   // Fracture crimson
    fractureBg: '#fee2e2',
    primary: '#0284c7',    // Sky blue
    primaryLight: '#38bdf8',
    darkBg: '#0f172a',
    cardBg: '#1e293b',
    border: '#334155',
    textMain: '#f8fafc',
    textMuted: '#94a3b8'
  };

  // ==========================================================================
  // 2. DOM ELEMENT SELECTORS
  // ==========================================================================
  let dom = {};

  function queryElements() {
    dom = {
      // Header controls
      btnTheory: document.getElementById('btn-theory'),
      btnQuiz: document.getElementById('btn-quiz'),
      btnExportCsv: document.getElementById('btn-export-csv'),
      btnReset: document.getElementById('btn-reset'),

      // Navigation tabs & step buttons
      tabBtnSetup: document.getElementById('tab-btn-setup'),
      tabBtnSimulate: document.getElementById('tab-btn-simulate'),
      tabBtnAnalysis: document.getElementById('tab-btn-analysis'),
      tabBtnSweep: document.getElementById('tab-btn-sweep'),

      panelSetup: document.getElementById('panel-setup'),
      panelSimulate: document.getElementById('panel-simulate'),
      panelAnalysis: document.getElementById('panel-analysis'),
      panelSweep: document.getElementById('panel-sweep'),

      btnRunToSim: document.getElementById('btn-run-to-sim'),
      btnNavBackToSetup: document.getElementById('btn-nav-back-to-setup'),
      btnNavFwdToAnalysis: document.getElementById('btn-nav-fwd-to-analysis'),
      btnNavFwdToSweep: document.getElementById('btn-nav-fwd-to-sweep'),

      // Tab 1: Setup Sliders
      sliderHeight: document.getElementById('slider-height'),
      sliderAngle: document.getElementById('slider-angle'),
      sliderVx: document.getElementById('slider-vx'),
      sliderVy: document.getElementById('slider-vy'),
      sliderOmega: document.getElementById('slider-omega'),
      sliderBracing: document.getElementById('slider-bracing'),
      sliderMass: document.getElementById('slider-mass'),
      sliderStature: document.getElementById('slider-stature'),
      sliderSurfaceStiffness: document.getElementById('slider-surface-stiffness'),
      sliderSurfaceDamping: document.getElementById('slider-surface-damping'),
      sliderInjuryTolerance: document.getElementById('slider-injury-tolerance'),

      // Tab 1: Slider Badges
      valHeight: document.getElementById('val-height'),
      valAngle: document.getElementById('val-angle'),
      valVx: document.getElementById('val-vx'),
      valVy: document.getElementById('val-vy'),
      valOmega: document.getElementById('val-omega'),
      valBracing: document.getElementById('val-bracing'),
      valMass: document.getElementById('val-mass'),
      valStature: document.getElementById('val-stature'),
      valSurfaceStiffness: document.getElementById('val-surface-stiffness'),
      valSurfaceDamping: document.getElementById('val-surface-damping'),
      valInjuryTolerance: document.getElementById('val-injury-tolerance'),

      // Tab 1: Setup Preview Canvas & Controls
      canvasSetupPreview: document.getElementById('canvas-setup-preview'),
      btnSetupSagittal: document.getElementById('btn-setup-sagittal'),
      btnSetupFit: document.getElementById('btn-setup-fit'),
      btnSetupResetCam: document.getElementById('btn-setup-reset-cam'),
      btnSetupZoomIn: document.getElementById('btn-setup-zoom-in'),
      btnSetupZoomOut: document.getElementById('btn-setup-zoom-out'),
      btnSetupPanReset: document.getElementById('btn-setup-pan-reset'),

      // Tab 1: HUD & Pre-flight strip
      setupHudH: document.getElementById('setup-hud-h'),
      setupHudAngle: document.getElementById('setup-hud-angle'),
      setupHudV0: document.getElementById('setup-hud-v0'),
      setupHudVimpact: document.getElementById('setup-hud-vimpact'),
      setupHudTfall: document.getElementById('setup-hud-tfall'),

      setupStripHeight: document.getElementById('setup-strip-height'),
      setupStripPe: document.getElementById('setup-strip-pe'),
      setupStripVel: document.getElementById('setup-strip-vel'),
      setupStripTime: document.getElementById('setup-strip-time'),

      // Preset buttons
      presetButtons: document.querySelectorAll('.btn-preset'),

      // Tab 2: Simulation Controls & Canvas
      canvasSimulation: document.getElementById('canvas-simulation'),
      btnPlayPause: document.getElementById('btn-play-pause'),
      btnSimRestart: document.getElementById('btn-sim-restart'),
      btnStepBack: document.getElementById('btn-step-back'),
      btnStepFwd: document.getElementById('btn-step-fwd'),
      selectSimSpeed: document.getElementById('select-sim-speed'),

      chkShowCom: document.getElementById('chk-show-com'),
      chkShowGrf: document.getElementById('chk-show-grf'),
      chkShowTrajectory: document.getElementById('chk-show-trajectory'),
      chkShowStressColors: document.getElementById('chk-show-stress-colors'),
      chkSlowmoImpact: document.getElementById('chk-slowmo-impact'),

      btnCamFollow: document.getElementById('btn-cam-follow'),
      btnCamFixed: document.getElementById('btn-cam-fixed'),
      btnCamGround: document.getElementById('btn-cam-ground'),
      btnExportVideo: document.getElementById('btn-export-video'),

      btnSimZoomIn: document.getElementById('btn-sim-zoom-in'),
      btnSimZoomOut: document.getElementById('btn-sim-zoom-out'),
      btnSimRecenter: document.getElementById('btn-sim-recenter'),

      sliderTimeline: document.getElementById('slider-timeline'),
      timelineTimeDisplay: document.getElementById('timeline-time-display'),
      badgeEventRelease: document.getElementById('badge-event-release'),
      badgeEventImpact: document.getElementById('badge-event-impact'),
      badgeEventPeak: document.getElementById('badge-event-peak'),
      badgeEventRest: document.getElementById('badge-event-rest'),

      // Keyframe Filmstrip
      keyframeFilmstripContainer: document.getElementById('keyframe-filmstrip-container'),
      keyframeFilmstrip: document.getElementById('keyframe-filmstrip'),

      // Simulation HUD
      hudSimTime: document.getElementById('hud-sim-time'),
      hudSimPhase: document.getElementById('hud-sim-phase'),
      hudSimHeight: document.getElementById('hud-sim-height'),
      hudSimVel: document.getElementById('hud-sim-vel'),
      hudSimGrf: document.getElementById('hud-sim-grf'),
      hudSimKe: document.getElementById('hud-sim-ke'),

      // 6-Card Metrics Ribbon
      cardMetricGrf: document.getElementById('card-metric-grf'),
      liveMetricGrf: document.getElementById('live-metric-grf'),
      liveMetricGrfBw: document.getElementById('live-metric-grf-bw'),

      cardMetricVel: document.getElementById('card-metric-vel'),
      liveMetricVel: document.getElementById('live-metric-vel'),
      liveMetricVelKmh: document.getElementById('live-metric-vel-kmh'),

      cardMetricSegment: document.getElementById('card-metric-segment'),
      liveMetricSegment: document.getElementById('live-metric-segment'),
      liveMetricSegmentDesc: document.getElementById('live-metric-segment-desc'),

      cardMetricHic: document.getElementById('card-metric-hic'),
      liveMetricHic: document.getElementById('live-metric-hic'),
      liveMetricHicRisk: document.getElementById('live-metric-hic-risk'),

      cardMetricSpine: document.getElementById('card-metric-spine'),
      liveMetricSpine: document.getElementById('live-metric-spine'),
      liveMetricSpineRisk: document.getElementById('live-metric-spine-risk'),

      cardMetricEnergy: document.getElementById('card-metric-energy'),
      liveMetricEnergy: document.getElementById('live-metric-energy'),
      liveMetricEnergyPct: document.getElementById('live-metric-energy-pct'),

      // Tab 3: Analysis & Injury Map
      canvasInjuryMap: document.getElementById('canvas-injury-map'),
      btnInjuryZoomIn: document.getElementById('btn-injury-zoom-in'),
      btnInjuryZoomOut: document.getElementById('btn-injury-zoom-out'),
      btnInjuryRecenter: document.getElementById('btn-injury-recenter'),

      forensicDiagnosisBanner: document.getElementById('forensic-diagnosis-banner'),
      diagRegimePill: document.getElementById('diag-regime-pill'),
      diagPrimaryImpact: document.getElementById('diag-primary-impact'),
      diagPulseDuration: document.getElementById('diag-pulse-duration'),
      diagFracturePattern: document.getElementById('diag-fracture-pattern'),
      diagAisScore: document.getElementById('diag-ais-score'),

      segmentCardsContainer: document.getElementById('segment-cards-container'),

      // Tab 3: Chart Canvases
      chartGrf: document.getElementById('chart-grf'),
      chartSegments: document.getElementById('chart-segments'),
      chartHeadSpine: document.getElementById('chart-head-spine'),
      chartEnergy: document.getElementById('chart-energy'),

      // Tab 4: Sweep Controls & Chart Canvases
      btnRunSweep: document.getElementById('btn-run-sweep'),
      chartBimodalRisk: document.getElementById('chart-bimodal-risk'),
      chartBimodalAngle: document.getElementById('chart-bimodal-angle'),
      regimeSummaryCards: document.querySelectorAll('.regime-summary-card'),

      // Modals
      modalTheory: document.getElementById('modal-theory'),
      btnCloseTheoryModal: document.getElementById('btn-close-theory-modal'),
      modalQuiz: document.getElementById('modal-quiz'),
      btnCloseQuizModal: document.getElementById('btn-close-quiz-modal')
    };
  }

  // ==========================================================================
  // 3. PARAMETER SYNCHRONIZATION & PRE-FLIGHT CALCULATIONS
  // ==========================================================================
  function readParamsFromInputs() {
    if (!dom.sliderHeight) return;

    const h = parseFloat(dom.sliderHeight.value) || 5.0;
    const angle = parseFloat(dom.sliderAngle.value) || 0;
    const vx = parseFloat(dom.sliderVx.value) || 0;
    const vy = parseFloat(dom.sliderVy.value) || 0;
    const omegaRad = parseFloat(dom.sliderOmega.value) || 0;
    const bracingPct = parseFloat(dom.sliderBracing.value) || 50;
    const mass = parseFloat(dom.sliderMass.value) || 75;
    const stature = parseFloat(dom.sliderStature.value) || 1.75;
    const rawStiffness = parseFloat(dom.sliderSurfaceStiffness.value) || 2500000;
    const restitution = parseFloat(dom.sliderSurfaceDamping.value) || 0.25;
    const tolerance = parseFloat(dom.sliderInjuryTolerance.value) || 1.00;

    // Convert raw stiffness (N/m) to kN/m used in physics.js
    const stiffness = Math.round(rawStiffness / 1000);
    // Convert restitution to damping factor c (40 to 95)
    const damping = Math.round(100 - restitution * 65);
    // Convert angular velocity to deg/s for physics.js
    const omegaDeg = omegaRad * (180 / Math.PI);

    state.params = {
      height: h,
      angleDeg: angle,
      vx: vx,
      vy: vy,
      omegaRad: omegaRad,
      omegaDeg: omegaDeg,
      bracing: bracingPct / 100,
      mass: mass,
      stature: stature,
      stiffness: stiffness,
      damping: damping,
      restitution: restitution,
      tolerance: tolerance,
      surface: resolveSurfaceName(stiffness)
    };

    state.isDirty = true;
    state.isSweepDirty = true;
  }

  function resolveSurfaceName(stiffnessKNm) {
    if (stiffnessKNm >= 4000) return 'concrete';
    if (stiffnessKNm >= 2000) return 'asphalt';
    if (stiffnessKNm >= 600) return 'wood';
    if (stiffnessKNm >= 200) return 'soil';
    return 'mat';
  }

  function updateBadgesAndMetrics() {
    const p = state.params;

    // Slider badges
    if (dom.valHeight) dom.valHeight.textContent = `${p.height.toFixed(1)} m`;
    if (dom.valAngle) dom.valAngle.textContent = `${p.angleDeg}°`;
    if (dom.valVx) dom.valVx.textContent = `${p.vx >= 0 ? '+' : ''}${p.vx.toFixed(1)} m/s`;
    if (dom.valVy) dom.valVy.textContent = `${p.vy >= 0 ? '+' : ''}${p.vy.toFixed(1)} m/s`;
    if (dom.valOmega) dom.valOmega.textContent = `${p.omegaRad.toFixed(1)} rad/s`;
    if (dom.valBracing) dom.valBracing.textContent = `${Math.round(p.bracing * 100)}%`;
    if (dom.valMass) dom.valMass.textContent = `${Math.round(p.mass)} kg`;
    if (dom.valStature) dom.valStature.textContent = `${p.stature.toFixed(2)} m`;

    if (dom.valSurfaceStiffness) {
      const sciVal = (p.stiffness / 1000).toFixed(1);
      const name = p.surface.charAt(0).toUpperCase() + p.surface.slice(1);
      dom.valSurfaceStiffness.textContent = `${sciVal}×10⁶ N/m (${name})`;
    }

    if (dom.valSurfaceDamping) {
      let surfDesc = 'Damped';
      if (p.restitution < 0.15) surfDesc = 'Plastic Soil';
      else if (p.restitution < 0.35) surfDesc = 'Damped Soil/Asph';
      else if (p.restitution < 0.60) surfDesc = 'Elastic Wood';
      else surfDesc = 'High Restitution';
      dom.valSurfaceDamping.textContent = `${p.restitution.toFixed(2)} (${surfDesc})`;
    }

    if (dom.valInjuryTolerance) {
      let tolDesc = 'Standard Adult';
      if (p.tolerance <= 0.45) tolDesc = 'Fragile / Osteoporotic';
      else if (p.tolerance <= 0.75) tolDesc = 'Pediatric / Osteopenic';
      else if (p.tolerance >= 1.25) tolDesc = 'Athletic / Hyper-Dense';
      dom.valInjuryTolerance.textContent = `${p.tolerance.toFixed(2)} (${tolDesc})`;
    }

    // Kinematics pre-flight estimation
    const g = 9.81;
    const v0 = Math.hypot(p.vx, p.vy);
    const pe = Math.round(p.mass * g * p.height);

    // Analytic projectile impact velocity and duration
    // vy_impact = -sqrt(vy^2 + 2*g*h)
    const vyImpact = -Math.sqrt(p.vy * p.vy + 2 * g * p.height);
    const vImpact = Math.sqrt(p.vx * p.vx + vyImpact * vyImpact);
    const vImpactKmh = vImpact * 3.6;

    // t_fall: solve -0.5*g*t^2 + vy*t + h = 0 -> 0.5*g*t^2 - vy*t - h = 0
    const discriminant = p.vy * p.vy + 2 * g * p.height;
    const tFall = (p.vy + Math.sqrt(discriminant)) / g;

    // Setup HUD
    if (dom.setupHudH) dom.setupHudH.textContent = `${p.height.toFixed(2)} m`;
    if (dom.setupHudAngle) dom.setupHudAngle.textContent = `${p.angleDeg.toFixed(1)}°`;
    if (dom.setupHudV0) dom.setupHudV0.textContent = `${v0.toFixed(2)} m/s`;
    if (dom.setupHudVimpact) dom.setupHudVimpact.textContent = `${vImpact.toFixed(2)} m/s (${vImpactKmh.toFixed(1)} km/h)`;
    if (dom.setupHudTfall) dom.setupHudTfall.textContent = `${tFall.toFixed(3)} s`;

    // 4-Card Pre-Flight Strip
    if (dom.setupStripHeight) dom.setupStripHeight.textContent = `${p.height.toFixed(1)} m`;
    if (dom.setupStripPe) dom.setupStripPe.textContent = `${pe.toLocaleString()} J`;
    if (dom.setupStripVel) dom.setupStripVel.textContent = `${vImpact.toFixed(2)} m/s`;
    if (dom.setupStripTime) dom.setupStripTime.textContent = `${tFall.toFixed(2)} s`;
  }

  function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    if (dom.sliderHeight) dom.sliderHeight.value = preset.height;
    if (dom.sliderAngle) dom.sliderAngle.value = preset.angleDeg;
    if (dom.sliderVx) dom.sliderVx.value = preset.vx;
    if (dom.sliderVy) dom.sliderVy.value = preset.vy;
    if (dom.sliderOmega) dom.sliderOmega.value = preset.omegaRad;
    if (dom.sliderBracing) dom.sliderBracing.value = Math.round(preset.bracing * 100);
    if (dom.sliderMass) dom.sliderMass.value = preset.mass;
    if (dom.sliderStature) dom.sliderStature.value = preset.stature;
    if (dom.sliderSurfaceStiffness) dom.sliderSurfaceStiffness.value = preset.stiffness * 1000;
    if (dom.sliderSurfaceDamping) dom.sliderSurfaceDamping.value = preset.restitution;
    if (dom.sliderInjuryTolerance) dom.sliderInjuryTolerance.value = preset.tolerance;

    if (dom.presetButtons) {
      dom.presetButtons.forEach(btn => {
        if (btn.dataset.preset === presetKey) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    readParamsFromInputs();
    updateBadgesAndMetrics();
    renderSetupPreviewCanvas();
  }

  // ==========================================================================
  // 4. SIMULATION EXECUTION ENGINE
  // ==========================================================================
  function runFullSimulation() {
    readParamsFromInputs();

    const simParams = {
      height: state.params.height,
      angleDeg: state.params.angleDeg,
      vx: state.params.vx,
      vy: state.params.vy,
      omegaDeg: state.params.omegaDeg,
      mass: state.params.mass,
      stature: state.params.stature,
      surface: state.params.surface,
      stiffness: state.params.stiffness,
      damping: state.params.damping,
      tolerance: state.params.tolerance,
      bracing: state.params.bracing
    };

    state.simResult = Physics.runSimulation(simParams);
    state.isDirty = false;

    // Reset playback frame index and state
    state.playback.currentFrame = 0;
    state.playback.simTime = 0;
    state.playback.userScrubbed = false;
    state.playback.isSlowMoActive = false;
    if (dom.sliderTimeline) {
      dom.sliderTimeline.max = Math.max(0, state.simResult.frames.length - 1);
      dom.sliderTimeline.value = 0;
    }
    if (dom.btnPlayPause) {
      dom.btnPlayPause.innerHTML = '<span>▶</span> Play Simulation';
      dom.btnPlayPause.classList.add('btn-primary');
      dom.btnPlayPause.classList.remove('btn-secondary');
    }

    updateTimelineBadges();
    renderKeyframeFilmstrip();
    updateKeyframeHighlight();
    updateTelemetryRibbon();
    updateForensicDiagnosisBanner();
    renderSegmentDiagnosticCards();

    // If on Tab 3, update charts
    if (state.activeTab === 'analysis') {
      updateAnalysisCharts();
      renderInjuryMapCanvas();
    }
  }

  function updateTimelineBadges() {
    if (!state.simResult) return;
    const sim = state.simResult;
    const sum = sim.summary;

    if (dom.badgeEventRelease) {
      dom.badgeEventRelease.textContent = 'Release: t=0.000s';
    }
    if (dom.badgeEventImpact) {
      dom.badgeEventImpact.textContent = `Primary Impact: t=${sum.flightTimeS.toFixed(3)}s`;
    }

    // Find peak GRF time
    let peakT = sum.flightTimeS;
    let maxFz = 0;
    for (const f of sim.frames) {
      if (f.fzTotal > maxFz) {
        maxFz = f.fzTotal;
        peakT = f.t;
      }
    }
    if (dom.badgeEventPeak) {
      dom.badgeEventPeak.textContent = `Peak GRF: t=${peakT.toFixed(3)}s (${sum.peakGRF_KN.toFixed(1)} kN)`;
    }

    const lastFrame = sim.frames[sim.frames.length - 1];
    if (dom.badgeEventRest && lastFrame) {
      dom.badgeEventRest.textContent = `Rest: t=${lastFrame.t.toFixed(3)}s`;
    }
  }

  function updateTelemetryRibbon() {
    if (!state.simResult) return;
    const sim = state.simResult;
    const sum = sim.summary;
    const p = state.params;

    // Card 1: Peak GRF
    const bw = (sum.peakGRF_KN * 1000) / (p.mass * 9.81);
    if (dom.liveMetricGrf) dom.liveMetricGrf.textContent = `${sum.peakGRF_KN.toFixed(1)} kN`;
    if (dom.liveMetricGrfBw) dom.liveMetricGrfBw.textContent = `${bw.toFixed(1)} x Body Weight`;
    if (dom.cardMetricGrf) {
      if (sum.peakGRF_KN > 30) dom.cardMetricGrf.classList.add('danger-alert');
      else dom.cardMetricGrf.classList.remove('danger-alert');
    }

    // Card 2: Impact Velocity
    const vKmh = sum.impactVelocityMS * 3.6;
    if (dom.liveMetricVel) dom.liveMetricVel.textContent = `${sum.impactVelocityMS.toFixed(2)} m/s`;
    if (dom.liveMetricVelKmh) dom.liveMetricVelKmh.textContent = `${vKmh.toFixed(1)} km/h (Resultant)`;

    // Card 3: Primary Impact Segment
    if (dom.liveMetricSegment) dom.liveMetricSegment.textContent = sum.primaryImpactSegment;
    if (dom.liveMetricSegmentDesc) {
      dom.liveMetricSegmentDesc.textContent = sum.secondaryImpactSegment !== 'None'
        ? `Secondary: ${sum.secondaryImpactSegment}`
        : 'Single-locus ground impact';
    }

    // Card 4: Head Injury Criterion
    const headSeg = sim.segmentResults.find(s => s.id === 'head');
    const skullRisk = headSeg ? headSeg.riskPercent : 0;
    if (dom.liveMetricHic) dom.liveMetricHic.textContent = `${Math.round(sum.hic15)}`;
    if (dom.liveMetricHicRisk) dom.liveMetricHicRisk.textContent = `Skull Fracture Risk: ${skullRisk.toFixed(0)}%`;
    if (dom.cardMetricHic) {
      if (sum.hic15 >= 1000 || skullRisk >= 50) dom.cardMetricHic.classList.add('danger-alert');
      else dom.cardMetricHic.classList.remove('danger-alert');
    }

    // Card 5: Axial Spine Load
    const spineSeg = sim.segmentResults.find(s => s.id === 'lumbarPelvis');
    const spineLoad = spineSeg ? spineSeg.peakLoadKN : 0;
    const spineRisk = spineSeg ? spineSeg.riskPercent : 0;
    if (dom.liveMetricSpine) dom.liveMetricSpine.textContent = `${spineLoad.toFixed(2)} kN`;
    if (dom.liveMetricSpineRisk) dom.liveMetricSpineRisk.textContent = `Thoracolumbar Burst: ${spineRisk.toFixed(0)}%`;
    if (dom.cardMetricSpine) {
      if (spineRisk >= 75) dom.cardMetricSpine.classList.add('danger-alert');
      else dom.cardMetricSpine.classList.remove('danger-alert');
    }

    // Card 6: Energy Dissipated
    const lastTS = sim.timeSeries[sim.timeSeries.length - 1];
    const ediss = lastTS ? Math.round(lastTS.ediss) : 0;
    const initialPE = Math.round(p.mass * 9.81 * p.height);
    const edissPct = initialPE > 0 ? Math.min(100, Math.round((ediss / initialPE) * 100)) : 100;
    if (dom.liveMetricEnergy) dom.liveMetricEnergy.textContent = `${ediss.toLocaleString()} J`;
    if (dom.liveMetricEnergyPct) dom.liveMetricEnergyPct.textContent = `${edissPct}% of Somatic Energy`;
  }

  // ==========================================================================
  // 5. SEQUENTIAL WORKFLOW TAB CONTROLLER
  // ==========================================================================
  function switchTab(mode) {
    state.activeTab = mode;

    // Update nav tab buttons
    const navTabs = [
      { mode: 'setup', btn: dom.tabBtnSetup, panel: dom.panelSetup },
      { mode: 'simulate', btn: dom.tabBtnSimulate, panel: dom.panelSimulate },
      { mode: 'analysis', btn: dom.tabBtnAnalysis, panel: dom.panelAnalysis },
      { mode: 'sweep', btn: dom.tabBtnSweep, panel: dom.panelSweep }
    ];

    navTabs.forEach(t => {
      if (!t.btn || !t.panel) return;
      if (t.mode === mode) {
        t.btn.classList.add('active');
        t.panel.classList.add('active');
      } else {
        t.btn.classList.remove('active');
        t.panel.classList.remove('active');
      }
    });

    // If simulation parameters changed, run simulation
    if (state.isDirty || !state.simResult) {
      runFullSimulation();
    }

    // Trigger tab-specific initialization & rendering
    if (mode === 'setup') {
      renderSetupPreviewCanvas();
    } else if (mode === 'simulate') {
      renderSimulationCanvas();
      renderKeyframeFilmstrip();
      updateKeyframeHighlight();
    } else if (mode === 'analysis') {
      renderInjuryMapCanvas();
      renderSegmentDiagnosticCards();
      updateForensicDiagnosisBanner();
      updateAnalysisCharts();
    } else if (mode === 'sweep') {
      if (state.isSweepDirty || !state.sweepResult) {
        runSweepCalculation();
      }
      highlightRegimeCard();
      updateSweepCharts();
    }
  }

  // ==========================================================================
  // 6. TAB 1: SETUP & PRE-FLIGHT PREVIEW CANVAS RENDERER
  // ==========================================================================
  function setupHiDPICanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : canvas.width;
    const h = rect.height > 0 ? rect.height : canvas.height;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    return { ctx, w, h, dpr };
  }

  function renderSetupPreviewCanvas() {
    const canvas = dom.canvasSetupPreview;
    if (!canvas) return;

    const { ctx, w, h } = setupHiDPICanvas(canvas);
    const p = state.params;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Compute coordinate mapping: world to screen
    const margin = { top: 40, bottom: 50, left: 90, right: 80 };
    const fallH = Math.max(1.0, p.height);

    // Ballistic trajectory landing prediction
    const g = 9.81;
    const tFall = (p.vy + Math.sqrt(p.vy * p.vy + 2 * g * fallH)) / g;
    const xImpact = p.vx * tFall;
    const vImpact = Math.sqrt(p.vx * p.vx + Math.pow(p.vy - g * tFall, 2));

    const worldW = Math.max(6.0, Math.abs(xImpact) + 4.0);
    const worldH = fallH + 2.5;

    // Base zoom & user pan/zoom
    const baseScale = Math.min((w - margin.left - margin.right) / worldW, (h - margin.top - margin.bottom) / worldH);
    const scale = baseScale * state.setupView.zoomScale;

    const originX = margin.left + state.setupView.panOffset.x;
    const originY = h - margin.bottom + state.setupView.panOffset.y;

    function toScreen(x, y) {
      return {
        sx: originX + x * scale,
        sy: originY - y * scale
      };
    }

    // 1. Draw Elevation Grid & Building Story Lines
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';

    // Horizontal meter grid lines
    const maxGridY = Math.ceil(worldH);
    for (let y = 0; y <= maxGridY; y++) {
      const sp = toScreen(0, y);
      ctx.strokeStyle = (y % 3 === 0) ? 'rgba(56, 189, 248, 0.22)' : 'rgba(148, 163, 184, 0.10)';
      ctx.beginPath();
      ctx.moveTo(margin.left - 20, sp.sy);
      ctx.lineTo(w - 20, sp.sy);
      ctx.stroke();

      // Tick label
      ctx.fillStyle = (y % 3 === 0) ? '#38bdf8' : '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`${y} m`, margin.left - 25, sp.sy + 3);

      // Building story marker (approx 3.0 m per story)
      if (y > 0 && y % 3 === 0) {
        const storyNum = y / 3;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(`Floor ${storyNum}`, w - 75, sp.sy - 4);
      }
    }

    // 2. Draw Building Elevation Structure / Launch Ledge
    const ledgeP1 = toScreen(-3.5, fallH);
    const ledgeP2 = toScreen(0, fallH);
    const groundLedge = toScreen(0, 0);

    // Wall fill
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(ledgeP1.sx, ledgeP1.sy, ledgeP2.sx - ledgeP1.sx, groundLedge.sy - ledgeP1.sy);

    // Wall edge
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ledgeP1.sx, ledgeP1.sy);
    ctx.lineTo(ledgeP2.sx, ledgeP2.sy);
    ctx.lineTo(groundLedge.sx, groundLedge.sy);
    ctx.stroke();

    // Hazard striped roof edge
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(ledgeP1.sx, ledgeP1.sy);
    ctx.lineTo(ledgeP2.sx, ledgeP2.sy);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Impact Substrate Layer at y = 0
    const gP1 = toScreen(-4.0, 0);
    const gP2 = toScreen(worldW + 5.0, 0);
    const subH = 30;

    // Substrate color based on surface
    let surfColor = '#475569';
    let surfName = 'Asphalt';
    if (p.surface === 'concrete') { surfColor = '#64748b'; surfName = 'Rigid Concrete'; }
    else if (p.surface === 'wood') { surfColor = '#b45309'; surfName = 'Hardwood Floor'; }
    else if (p.surface === 'soil') { surfColor = '#15803d'; surfName = 'Compacted Soil'; }
    else if (p.surface === 'mat') { surfColor = '#0284c7'; surfName = 'Safety Mat'; }

    ctx.fillStyle = surfColor;
    ctx.fillRect(gP1.sx, gP1.sy, gP2.sx - gP1.sx, subH);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gP1.sx, gP1.sy);
    ctx.lineTo(gP2.sx, gP1.sy);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Substrate: ${surfName} (k = ${p.stiffness} kN/m, e = ${p.restitution})`, gP1.sx + 15, gP1.sy + 18);

    // 4. Draw Predicted Parabolic Flight Path
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();

    const dtStep = tFall / 60;
    for (let i = 0; i <= 60; i++) {
      const curT = i * dtStep;
      const curX = p.vx * curT;
      const curY = fallH + p.vy * curT - 0.5 * g * curT * curT;
      const sp = toScreen(curX, Math.max(0, curY));
      if (i === 0) ctx.moveTo(sp.sx, sp.sy);
      else ctx.lineTo(sp.sx, sp.sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Impact Crosshair & Badge
    const impactSp = toScreen(xImpact, 0);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(impactSp.sx, impactSp.sy, 8, 0, Math.PI * 2);
    ctx.moveTo(impactSp.sx - 12, impactSp.sy);
    ctx.lineTo(impactSp.sx + 12, impactSp.sy);
    ctx.moveTo(impactSp.sx, impactSp.sy - 12);
    ctx.lineTo(impactSp.sx, impactSp.sy + 12);
    ctx.stroke();

    // Impact Callout Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    const tagX = impactSp.sx + 15;
    const tagY = impactSp.sy - 40;
    ctx.fillRect(tagX, tagY, 150, 36);
    ctx.strokeRect(tagX, tagY, 150, 36);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Impact: x = ${xImpact.toFixed(2)} m`, tagX + 8, tagY + 14);
    ctx.fillText(`v = ${vImpact.toFixed(1)} m/s (${(vImpact * 3.6).toFixed(0)} km/h)`, tagX + 8, tagY + 28);

    // 5. Draw Articulated Scaled Human Figure at Launch
    const anthro = Physics.computeAnthropometrics(p.mass, p.stature, p.tolerance);
    const model = Physics.computeAnthropometrics ? Physics.computeAnthropometrics(p.mass, p.stature, p.tolerance) : null;
    
    // We compute local positions rotated by initial pitch angle
    const theta0 = (p.angleDeg * Math.PI) / 180.0;
    const cosT = Math.cos(theta0);
    const sinT = Math.sin(theta0);

    // Anatomical segment offsets scaled to body stature
    const H = p.stature;
    const B = p.bracing;

    // Body segments in local coords relative to CoM
    // CoM is placed at (0, fallH + 0.95*H)
    const comLaunch = toScreen(0, fallH + 0.60 * H);

    function rotateNode(dx, dy) {
      const rx = dx * cosT - dy * sinT;
      const ry = dx * sinT + dy * cosT;
      return {
        sx: comLaunch.sx + rx * scale,
        sy: comLaunch.sy - ry * scale
      };
    }

    // Local anatomical points relative to CoM
    const nHead = rotateNode(0.0, 0.44 * H);
    const nNeck = rotateNode(0.0, 0.32 * H);
    const nThorax = rotateNode(0.0, 0.15 * H);
    const nPelvis = rotateNode(0.0, -0.05 * H);
    const nKnee = rotateNode(0.02 * H, -0.32 * H);
    const nAnkle = rotateNode(0.0, -0.58 * H);
    const nFoot = rotateNode(0.08 * H, -0.62 * H);

    // Arm nodes influenced by bracing
    const nElbow = rotateNode(0.12 * H * B + 0.04 * H, 0.20 * H);
    const nWrist = rotateNode(0.24 * H * B + 0.08 * H, 0.12 * H);

    // Draw articulated bones
    ctx.lineCap = 'round';

    function drawBone(p1, p2, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(nHead.sx, nHead.sy, Math.max(5, 0.07 * H * scale), 0, Math.PI * 2);
    ctx.fill();

    // Neck & Spine
    drawBone(nHead, nNeck, '#38bdf8', Math.max(3, 0.04 * H * scale));
    drawBone(nNeck, nThorax, '#0284c7', Math.max(4, 0.07 * H * scale));
    drawBone(nThorax, nPelvis, '#0284c7', Math.max(5, 0.08 * H * scale));

    // Lower limbs
    drawBone(nPelvis, nKnee, '#10b981', Math.max(4, 0.06 * H * scale));
    drawBone(nKnee, nAnkle, '#10b981', Math.max(3, 0.05 * H * scale));
    drawBone(nAnkle, nFoot, '#10b981', Math.max(3, 0.04 * H * scale));

    // Upper limbs
    drawBone(nNeck, nElbow, '#10b981', Math.max(3, 0.04 * H * scale));
    drawBone(nElbow, nWrist, '#10b981', Math.max(3, 0.035 * H * scale));

    // Joint caps
    ctx.fillStyle = '#ffffff';
    [nNeck, nThorax, nPelvis, nKnee, nAnkle, nElbow, nWrist].forEach(n => {
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Initial Velocity Vector Arrow (v0)
    const v0Mag = Math.hypot(p.vx, p.vy);
    if (v0Mag > 0.05) {
      const vArrowLen = 35 * Math.min(3.0, v0Mag);
      const vAngle = Math.atan2(p.vy, p.vx);
      const endVx = comLaunch.sx + vArrowLen * Math.cos(vAngle);
      const endVy = comLaunch.sy - vArrowLen * Math.sin(vAngle);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(comLaunch.sx, comLaunch.sy);
      ctx.lineTo(endVx, endVy);
      ctx.stroke();

      // Arrow head
      const headLen = 9;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(endVx, endVy);
      ctx.lineTo(
        endVx - headLen * Math.cos(vAngle - Math.PI / 6),
        endVy + headLen * Math.sin(vAngle - Math.PI / 6)
      );
      ctx.lineTo(
        endVx - headLen * Math.cos(vAngle + Math.PI / 6),
        endVy + headLen * Math.sin(vAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`v₀ = ${v0Mag.toFixed(1)} m/s`, endVx + 6, endVy);
    }

    // 7. Draw Angular Velocity Arc (omega0)
    if (Math.abs(p.omegaRad) > 0.1) {
      const arcR = 24;
      const startA = p.omegaRad > 0 ? -0.2 : 0.8;
      const endA = p.omegaRad > 0 ? 1.6 : -1.0;

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(comLaunch.sx, comLaunch.sy, arcR, startA, endA, p.omegaRad < 0);
      ctx.stroke();

      // Arc label
      ctx.fillStyle = '#c084fc';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`ω₀: ${p.omegaRad.toFixed(1)} rad/s`, comLaunch.sx - 35, comLaunch.sy - arcR - 4);
    }
  }

  // ==========================================================================
  // 7. TAB 2: DYNAMIC MULTI-BODY SIMULATION PLAYBACK & CANVAS RENDERER
  // ==========================================================================
  function renderSimulationCanvas(isWatermarkMode = false, overrideFrame = null) {
    const canvas = dom.canvasSimulation;
    if (!canvas || !state.simResult) return;

    const { ctx, w, h } = setupHiDPICanvas(canvas);
    const sim = state.simResult;
    const frames = sim.frames;
    if (!frames || frames.length === 0) return;

    const frameIdx = Math.max(0, Math.min(frames.length - 1, state.playback.currentFrame));
    const curFrame = overrideFrame || frames[frameIdx];

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Camera Transformation Modes
    let camX = curFrame.comX;
    let camY = curFrame.comY;
    let baseScale = 85.0; // pixels per meter

    if (state.playback.cameraMode === 'fixed') {
      const p = state.params;
      camX = curFrame.comX * 0.5;
      camY = p.height * 0.45;
      baseScale = Math.min(w / (Math.max(6.0, p.vx * 1.5 + 4.0)), h / (p.height + 2.5)) * 0.75;
    } else if (state.playback.cameraMode === 'ground') {
      camX = curFrame.comX;
      camY = 1.0;
      baseScale = 140.0;
    }

    const scale = baseScale * state.playback.zoomScale;
    const centerX = w * 0.5 + state.playback.panOffset.x;
    const centerY = h * 0.65 + state.playback.panOffset.y;

    function toScreen(x, y) {
      return {
        sx: centerX + (x - camX) * scale,
        sy: centerY - (y - camY) * scale
      };
    }

    // 1. Elevation Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    const gridSpacing = 1.0; // 1 meter grid
    const startGridX = Math.floor((camX - w / (2 * scale)) / gridSpacing) * gridSpacing;
    const endGridX = Math.ceil((camX + w / (2 * scale)) / gridSpacing) * gridSpacing;

    for (let gx = startGridX; gx <= endGridX; gx += gridSpacing) {
      const sp = toScreen(gx, 0);
      ctx.beginPath();
      ctx.moveTo(sp.sx, 0);
      ctx.lineTo(sp.sx, h);
      ctx.stroke();
    }

    // 2. Ground Substrate Layer at y = 0
    const gLeft = toScreen(-100, 0);
    const gRight = toScreen(100, 0);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gLeft.sx, gLeft.sy, gRight.sx - gLeft.sx, h - gLeft.sy + 50);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gLeft.sx, gLeft.sy);
    ctx.lineTo(gRight.sx, gLeft.sy);
    ctx.stroke();

    // 3. Trajectory Trail Overlay
    if (dom.chkShowTrajectory && dom.chkShowTrajectory.checked) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i <= frameIdx; i++) {
        const f = frames[i];
        const sp = toScreen(f.comX, f.comY);
        if (i === 0) ctx.moveTo(sp.sx, sp.sy);
        else ctx.lineTo(sp.sx, sp.sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Ground Reaction Force Ripple Shockwave
    if (curFrame.fzTotal > 0.5) {
      const r = Math.min(70, curFrame.fzTotal * 1.5);
      const groundSp = toScreen(curFrame.comX, 0);
      ctx.strokeStyle = `rgba(239, 68, 68, ${Math.min(0.8, curFrame.fzTotal / 30)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(groundSp.sx, groundSp.sy, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Draw Articulated Human Body (10 Nodes, 9 Segments)
    const nds = curFrame.nodes;
    const fi = curFrame.segInstantFI || {};
    const useStressColors = dom.chkShowStressColors && dom.chkShowStressColors.checked;

    function getSegmentColor(segId) {
      if (!useStressColors) return '#38bdf8';
      const val = fi[segId] != null ? fi[segId] : 0;
      if (val >= 1.0) return COLORS.fracture;
      if (val >= 0.65) return COLORS.micro;
      return COLORS.safe;
    }

    function drawBone(n1Key, n2Key, segId, width) {
      if (!nds[n1Key] || !nds[n2Key]) return;
      const p1 = toScreen(nds[n1Key].x, nds[n1Key].y);
      const p2 = toScreen(nds[n2Key].x, nds[n2Key].y);
      const col = getSegmentColor(segId);

      ctx.strokeStyle = col;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      // If fractured, draw crack effect
      if (useStressColors && fi[segId] >= 1.0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        const midX = (p1.sx + p2.sx) * 0.5;
        const midY = (p1.sy + p2.sy) * 0.5;
        ctx.beginPath();
        ctx.moveTo(midX - 4, midY - 4);
        ctx.lineTo(midX + 4, midY + 4);
        ctx.stroke();
      }
    }

    // Draw Skeletal Segments
    drawBone('headCenter', 'neckBase', 'neck', 7);
    drawBone('neckBase', 'midThorax', 'thorax', 14);
    drawBone('midThorax', 'hipPelvis', 'lumbarPelvis', 15);

    // Limbs
    drawBone('hipPelvis', 'knee', 'thigh', 12);
    drawBone('knee', 'ankle', 'shank', 10);
    drawBone('ankle', 'footTip', 'foot', 8);

    drawBone('neckBase', 'elbow', 'upperArm', 8);
    drawBone('elbow', 'wrist', 'forearmHand', 7);

    // Head (Cranium)
    if (nds.headCenter && nds.headTop) {
      const spHead = toScreen(nds.headCenter.x, nds.headCenter.y);
      const headColor = getSegmentColor('head');
      const headR = Math.max(6, 0.10 * scale);

      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(spHead.sx, spHead.sy, headR, 0, Math.PI * 2);
      ctx.fill();

      // Draw Face Direction Indicator (visor/profile)
      const dxH = nds.headTop.x - nds.headCenter.x;
      const dyH = nds.headTop.y - nds.headCenter.y;
      const hAngle = Math.atan2(dyH, dxH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spHead.sx, spHead.sy);
      ctx.lineTo(spHead.sx + headR * Math.cos(hAngle), spHead.sy - headR * Math.sin(hAngle));
      ctx.stroke();
    }

    // Draw Joint Nodes
    ctx.fillStyle = '#ffffff';
    Object.keys(nds).forEach(k => {
      const sp = toScreen(nds[k].x, nds[k].y);
      ctx.beginPath();
      ctx.arc(sp.sx, sp.sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Ground Reaction Force Vector Arrow
    if (dom.chkShowGrf && dom.chkShowGrf.checked && curFrame.fzTotal > 0.1) {
      // Find lowest contacting node
      let minY = Infinity;
      let contactX = curFrame.comX;
      Object.keys(nds).forEach(k => {
        if (nds[k].y < minY) {
          minY = nds[k].y;
          contactX = nds[k].x;
        }
      });

      const spContact = toScreen(contactX, Math.max(0, minY));
      const grfArrowLen = Math.min(120, curFrame.fzTotal * 2.5);

      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(spContact.sx, spContact.sy);
      ctx.lineTo(spContact.sx, spContact.sy - grfArrowLen);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(spContact.sx, spContact.sy - grfArrowLen);
      ctx.lineTo(spContact.sx - 6, spContact.sy - grfArrowLen + 10);
      ctx.lineTo(spContact.sx + 6, spContact.sy - grfArrowLen + 10);
      ctx.closePath();
      ctx.fill();

      // Text Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(`${curFrame.fzTotal.toFixed(1)} kN`, spContact.sx + 8, spContact.sy - grfArrowLen + 10);
    }

    // 7. Center of Mass & Velocity Vector
    if (dom.chkShowCom && dom.chkShowCom.checked) {
      const spCom = toScreen(curFrame.comX, curFrame.comY);

      // Checkered CoM symbol
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(spCom.sx, spCom.sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // CoM velocity vector
      const vMag = Math.hypot(curFrame.comVx, curFrame.comVy);
      if (vMag > 0.1) {
        const vLen = Math.min(60, vMag * 4);
        const vAng = Math.atan2(curFrame.comVy, curFrame.comVx);
        const endVx = spCom.sx + vLen * Math.cos(vAng);
        const endVy = spCom.sy - vLen * Math.sin(vAng);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(spCom.sx, spCom.sy);
        ctx.lineTo(endVx, endVy);
        ctx.stroke();
      }
    }

    // 8. Auto Impact Slow-Mo Indicator Badge (Glowing Amber Badge)
    if (state.playback.isSlowMoActive && state.playback.isPlaying) {
      ctx.save();
      const badgeW = 270;
      const badgeH = 34;
      const badgeX = (w - badgeW) * 0.5;
      const badgeY = 20;

      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ AUTO IMPACT SLOW-MO (0.06×)', w * 0.5, badgeY + badgeH * 0.5);
      ctx.restore();
    }

    // 9. Video Watermark Header & Footer (When recording WebM video)
    if (isWatermarkMode) {
      // Header Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, 0, w, 44);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LTU EXPERIMENTAL BIOMECHANICS LAB · MULTI-BODY DYNAMICS FALL SIMULATION', 14, 18);

      const p = state.params;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`h: ${p.height}m | Mass: ${p.mass}kg | Substrate: ${p.surface} | Peak GRF: ${sim.summary.peakGRF_KN} kN | v_impact: ${sim.summary.impactVelocityMS} m/s`, 14, 34);

      // Footer Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`Time: ${curFrame.t.toFixed(3)}s | CoM Height: ${Math.max(0, curFrame.comY).toFixed(2)}m | GRF: ${curFrame.fzTotal.toFixed(1)} kN | Head Accel: ${curFrame.headG.toFixed(1)} g`, 14, h - 13);
    }

    // Update Simulation Live HUD
    updateSimulationHUD(curFrame);
  }

  function updateSimulationHUD(curFrame) {
    if (!curFrame) return;
    const sim = state.simResult;
    const p = state.params;

    if (dom.hudSimTime) dom.hudSimTime.textContent = `${curFrame.t.toFixed(3)} s`;

    // Phase detection
    let phaseText = 'Free Fall (Gravity Dominated)';
    if (curFrame.t >= sim.summary.flightTimeS && curFrame.t <= sim.summary.flightTimeS + 0.08) {
      phaseText = 'Primary Impact & Substrate Deceleration';
    } else if (curFrame.t > sim.summary.flightTimeS + 0.08) {
      phaseText = 'Post-Impact Rebound & Rest';
    }
    if (dom.hudSimPhase) dom.hudSimPhase.textContent = phaseText;

    if (dom.hudSimHeight) dom.hudSimHeight.textContent = `${Math.max(0, curFrame.comY).toFixed(2)} m`;

    const vMag = Math.hypot(curFrame.comVx, curFrame.comVy);
    if (dom.hudSimVel) {
      dom.hudSimVel.textContent = `${vMag.toFixed(2)} m/s (vx: ${curFrame.comVx.toFixed(2)}, vy: ${curFrame.comVy.toFixed(2)})`;
    }

    const bw = (curFrame.fzTotal * 1000) / (p.mass * 9.81);
    if (dom.hudSimGrf) {
      dom.hudSimGrf.textContent = `${curFrame.fzTotal.toFixed(1)} kN (${bw.toFixed(2)} BW)`;
    }

    const ke = Math.round(0.5 * p.mass * (curFrame.comVx * curFrame.comVx + curFrame.comVy * curFrame.comVy));
    if (dom.hudSimKe) dom.hudSimKe.textContent = `${ke.toLocaleString()} J`;

    // Timeline Time Readout
    const lastFrame = sim.frames[sim.frames.length - 1];
    const totalT = lastFrame ? lastFrame.t : 0;
    if (dom.timelineTimeDisplay) {
      dom.timelineTimeDisplay.textContent = `${curFrame.t.toFixed(3)} s / ${totalT.toFixed(3)} s`;
    }
  }

  // Helper: Interpolate simulation frame kinematics for buttery-smooth 60 FPS slow-motion
  function interpolateFrames(f0, f1, alpha, simTime) {
    const comX = f0.comX + alpha * (f1.comX - f0.comX);
    const comY = f0.comY + alpha * (f1.comY - f0.comY);
    const comVx = f0.comVx + alpha * (f1.comVx - f0.comVx);
    const comVy = f0.comVy + alpha * (f1.comVy - f0.comVy);
    const fzTotal = f0.fzTotal + alpha * (f1.fzTotal - f0.fzTotal);
    const fxTotal = f0.fxTotal + alpha * (f1.fxTotal - f0.fxTotal);
    const headG = f0.headG + alpha * (f1.headG - f0.headG);

    const nodes = {};
    if (f0.nodes && f1.nodes) {
      for (const k in f0.nodes) {
        const n0 = f0.nodes[k];
        const n1 = f1.nodes[k];
        if (n0 && n1) {
          nodes[k] = {
            x: n0.x + alpha * (n1.x - n0.x),
            y: n0.y + alpha * (n1.y - n0.y),
            vx: n0.vx + alpha * (n1.vx - n0.vx),
            vy: n0.vy + alpha * (n1.vy - n0.vy)
          };
        } else if (n0) {
          nodes[k] = n0;
        }
      }
    }

    const segInstantFI = {};
    const fi0 = f0.segInstantFI || {};
    const fi1 = f1.segInstantFI || {};
    for (const k in fi0) {
      const v0 = fi0[k] || 0;
      const v1 = fi1[k] != null ? fi1[k] : v0;
      segInstantFI[k] = v0 + alpha * (v1 - v0);
    }

    return {
      t: simTime,
      comX,
      comY,
      comVx,
      comVy,
      fzTotal,
      fxTotal,
      headG,
      nodes,
      segInstantFI
    };
  }

  // Playback Animation Loop with Time-Based Tracking & Smooth Auto Slow-Mo
  function playSimulation() {
    if (state.playback.isPlaying) return;
    const sim = state.simResult;
    if (!sim || !sim.frames || sim.frames.length === 0) return;

    state.playback.isPlaying = true;
    state.playback.lastTimestamp = performance.now();
    
    // Continuous simulation clock (in seconds)
    const curF = sim.frames[state.playback.currentFrame];
    state.playback.simTime = curF ? curF.t : 0;

    if (dom.btnPlayPause) {
      dom.btnPlayPause.innerHTML = '<span>⏸</span> Pause';
      dom.btnPlayPause.classList.add('btn-secondary');
      dom.btnPlayPause.classList.remove('btn-primary');
    }

    function animLoop(timestamp) {
      if (!state.playback.isPlaying) return;

      const deltaMs = Math.min(100, timestamp - state.playback.lastTimestamp);
      state.playback.lastTimestamp = timestamp;

      const sim = state.simResult;
      if (!sim || !sim.frames || sim.frames.length === 0) return;

      let speedFactor = state.playback.speed;
      let isSlowMo = false;

      // Auto slow-motion at ground impact & joint deceleration window
      const impactStart = sim.summary.flightTimeS - 0.025;
      const impactEnd = sim.summary.flightTimeS + 0.22;
      if (dom.chkSlowmoImpact && dom.chkSlowmoImpact.checked) {
        if (state.playback.simTime >= impactStart && state.playback.simTime <= impactEnd) {
          speedFactor = Math.min(speedFactor, 0.06);
          isSlowMo = true;
        }
      }
      state.playback.isSlowMoActive = isSlowMo;

      // Continuous time advance
      state.playback.simTime += (deltaMs / 1000) * speedFactor;

      const frames = sim.frames;
      const lastF = frames[frames.length - 1];

      // End-of-simulation check
      if (state.playback.simTime >= lastF.t) {
        state.playback.simTime = lastF.t;
        state.playback.currentFrame = frames.length - 1;
        state.playback.userScrubbed = false;
        if (dom.sliderTimeline) dom.sliderTimeline.value = frames.length - 1;
        renderSimulationCanvas();
        updateKeyframeHighlight();
        pauseSimulation(true);
        return;
      }

      // Linear search for bounding frame indices around current frame
      let idx = state.playback.currentFrame;
      if (idx < 0 || idx >= frames.length) idx = 0;

      while (idx < frames.length - 1 && frames[idx + 1].t <= state.playback.simTime) {
        idx++;
      }
      while (idx > 0 && frames[idx].t > state.playback.simTime) {
        idx--;
      }

      state.playback.currentFrame = idx;
      if (dom.sliderTimeline) dom.sliderTimeline.value = idx;

      // Sub-frame interpolation for 60 FPS fluid rendering during 0.06x slow-mo
      let renderFrame = frames[idx];
      if (idx < frames.length - 1) {
        const f0 = frames[idx];
        const f1 = frames[idx + 1];
        const span = f1.t - f0.t;
        if (span > 1e-6) {
          const alpha = Math.max(0, Math.min(1, (state.playback.simTime - f0.t) / span));
          renderFrame = interpolateFrames(f0, f1, alpha, state.playback.simTime);
        }
      }

      renderSimulationCanvas(false, renderFrame);
      updateKeyframeHighlight();

      if (state.playback.isPlaying) {
        state.playback.animId = requestAnimationFrame(animLoop);
      }
    }

    state.playback.animId = requestAnimationFrame(animLoop);
  }

  function pauseSimulation(isEnd = false) {
    state.playback.isPlaying = false;
    state.playback.isSlowMoActive = false;
    if (state.playback.animId) {
      cancelAnimationFrame(state.playback.animId);
      state.playback.animId = null;
    }
    if (dom.btnPlayPause) {
      const atEnd = isEnd || (state.simResult && state.playback.currentFrame >= state.simResult.frames.length - 1);
      if (atEnd) {
        dom.btnPlayPause.innerHTML = '<span>▶</span> Replay Simulation';
      } else {
        dom.btnPlayPause.innerHTML = '<span>▶</span> Play Simulation';
      }
      dom.btnPlayPause.classList.add('btn-primary');
      dom.btnPlayPause.classList.remove('btn-secondary');
    }
  }

  function restartSimulation() {
    pauseSimulation();
    state.playback.currentFrame = 0;
    state.playback.simTime = 0;
    state.playback.userScrubbed = false;
    if (dom.sliderTimeline) dom.sliderTimeline.value = 0;
    if (dom.btnPlayPause) {
      dom.btnPlayPause.innerHTML = '<span>▶</span> Play Simulation';
      dom.btnPlayPause.classList.add('btn-primary');
      dom.btnPlayPause.classList.remove('btn-secondary');
    }
    renderSimulationCanvas();
    updateKeyframeHighlight();
  }

  function stepFrame(delta) {
    pauseSimulation();
    if (!state.simResult || !state.simResult.frames) return;
    const maxF = state.simResult.frames.length - 1;
    state.playback.currentFrame = Math.max(0, Math.min(maxF, state.playback.currentFrame + delta));
    state.playback.simTime = state.simResult.frames[state.playback.currentFrame].t;
    state.playback.userScrubbed = true;
    if (dom.sliderTimeline) dom.sliderTimeline.value = state.playback.currentFrame;
    renderSimulationCanvas();
    updateKeyframeHighlight();
  }

  // Handle Play/Pause button click with intuitive auto-reset to t=0
  function handlePlayPauseClick() {
    if (state.playback.isPlaying) {
      pauseSimulation();
    } else {
      const sim = state.simResult;
      if (!sim || !sim.frames || sim.frames.length === 0) return;

      const atEnd = state.playback.currentFrame >= sim.frames.length - 1;
      const repressing = !state.playback.userScrubbed && state.playback.currentFrame > 0;

      if (atEnd || repressing) {
        state.playback.currentFrame = 0;
        state.playback.simTime = 0;
        state.playback.userScrubbed = false;
        if (dom.sliderTimeline) dom.sliderTimeline.value = 0;
      } else {
        state.playback.simTime = sim.frames[state.playback.currentFrame].t;
      }

      playSimulation();
    }
  }

  // ==========================================================================
  // 7b. PHASE KEYFRAME FILMSTRIP RENDERER & INTERACTION CONTROLLER
  // ==========================================================================
  function renderMiniKeyframeCanvas(canvas, curFrame, phaseIdx) {
    if (!canvas || !curFrame) return;

    const { ctx, w, h } = setupHiDPICanvas(canvas);
    const p = state.params;

    // Dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const nds = curFrame.nodes || {};
    const nodeKeys = Object.keys(nds);
    if (nodeKeys.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeKeys.forEach(k => {
      const n = nds[k];
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const bodyW = Math.max(1.0, maxX - minX);
    const bodyH = Math.max(1.2, maxY - minY);
    const bodyCenterX = (minX + maxX) * 0.5;
    const bodyCenterY = (minY + maxY) * 0.5;

    const nearGround = curFrame.comY < 1.2;
    let focusY = bodyCenterY;
    let viewH = bodyH + 0.45;
    if (nearGround) {
      focusY = Math.max(0.4, bodyCenterY);
      viewH = Math.max(1.6, maxY + 0.3);
    }

    const scale = Math.min((w - 24) / Math.max(1.4, bodyW + 0.5), (h - 20) / viewH);
    const centerX = w * 0.5;
    const centerY = nearGround ? (h * 0.78 - focusY * scale) : (h * 0.5);

    function toMiniScreen(x, y) {
      return {
        sx: centerX + (x - bodyCenterX) * scale,
        sy: nearGround ? (h * 0.78 - y * scale) : (centerY - (y - focusY) * scale)
      };
    }

    // Ground Substrate Layer
    if (nearGround || curFrame.comY < 2.0) {
      const gPt = toMiniScreen(0, 0);
      if (gPt.sy < h + 20) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, gPt.sy, w, Math.max(0, h - gPt.sy));
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, gPt.sy);
        ctx.lineTo(w, gPt.sy);
        ctx.stroke();
      }
    }

    // Launch Ledge for Phase 0
    if (phaseIdx === 0 && p.height > 0.5) {
      const ledgePt = toMiniScreen(0, p.height);
      ctx.fillStyle = '#334155';
      const ledgeRight = toMiniScreen(curFrame.comX - 0.2, p.height).sx;
      ctx.fillRect(0, ledgePt.sy, Math.max(20, ledgeRight), h - ledgePt.sy);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, ledgePt.sy);
      ctx.lineTo(Math.max(20, ledgeRight), ledgePt.sy);
      ctx.lineTo(Math.max(20, ledgeRight), h);
      ctx.stroke();
    }

    // Bone Colors based on stress / FI
    const fi = curFrame.segInstantFI || {};
    function getSegColor(segId) {
      const val = fi[segId] != null ? fi[segId] : 0;
      if (val >= 1.0) return '#ef4444'; // fracture red
      if (val >= 0.65) return '#f59e0b'; // micro amber
      return '#10b981'; // safe green
    }

    function drawMiniBone(n1Key, n2Key, segId, width) {
      if (!nds[n1Key] || !nds[n2Key]) return;
      const p1 = toMiniScreen(nds[n1Key].x, nds[n1Key].y);
      const p2 = toMiniScreen(nds[n2Key].x, nds[n2Key].y);

      ctx.strokeStyle = getSegColor(segId);
      ctx.lineWidth = Math.max(2, width * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Torso & Spine
    drawMiniBone('headCenter', 'neckBase', 'neck', 6);
    drawMiniBone('neckBase', 'midThorax', 'thorax', 10);
    drawMiniBone('midThorax', 'hipPelvis', 'lumbarPelvis', 11);

    // Lower Limbs
    drawMiniBone('hipPelvis', 'knee', 'thigh', 9);
    drawMiniBone('knee', 'ankle', 'shank', 7);
    drawMiniBone('ankle', 'footTip', 'foot', 6);

    // Upper Limbs
    drawMiniBone('neckBase', 'elbow', 'upperArm', 6);
    drawMiniBone('elbow', 'wrist', 'forearmHand', 5);

    // Head
    if (nds.headCenter) {
      const spHead = toMiniScreen(nds.headCenter.x, nds.headCenter.y);
      const headColor = getSegColor('head');
      const headR = Math.max(3.5, 0.08 * scale);

      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.arc(spHead.sx, spHead.sy, headR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Joint Nodes
    ctx.fillStyle = '#ffffff';
    nodeKeys.forEach(k => {
      const sp = toMiniScreen(nds[k].x, nds[k].y);
      ctx.beginPath();
      ctx.arc(sp.sx, sp.sy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // GRF Vector Arrow
    if (curFrame.fzTotal > 0.1) {
      let minYContact = Infinity;
      let contactX = curFrame.comX;
      nodeKeys.forEach(k => {
        if (nds[k].y < minYContact) {
          minYContact = nds[k].y;
          contactX = nds[k].x;
        }
      });
      const spContact = toMiniScreen(contactX, Math.max(0, minYContact));
      const arrowLen = Math.min(36, Math.max(14, curFrame.fzTotal * 1.2));

      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(spContact.sx, spContact.sy);
      ctx.lineTo(spContact.sx, spContact.sy - arrowLen);
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(spContact.sx, spContact.sy - arrowLen);
      ctx.lineTo(spContact.sx - 4, spContact.sy - arrowLen + 6);
      ctx.lineTo(spContact.sx + 4, spContact.sy - arrowLen + 6);
      ctx.closePath();
      ctx.fill();
    }

    // CoM Dot & Velocity Vector
    const spCom = toMiniScreen(curFrame.comX, curFrame.comY);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(spCom.sx, spCom.sy, 3, 0, Math.PI * 2);
    ctx.fill();

    const vMag = Math.hypot(curFrame.comVx, curFrame.comVy);
    if (vMag > 0.1 && curFrame.fzTotal <= 0.1) {
      const vLen = Math.min(22, vMag * 1.5);
      const vAng = Math.atan2(curFrame.comVy, curFrame.comVx);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(spCom.sx, spCom.sy);
      ctx.lineTo(spCom.sx + vLen * Math.cos(vAng), spCom.sy - vLen * Math.sin(vAng));
      ctx.stroke();
    }
  }

  function renderKeyframeFilmstrip() {
    const sim = state.simResult;
    if (!sim || !sim.frames || sim.frames.length === 0) return;

    const frames = sim.frames;
    const tFlight = sim.summary.flightTimeS;

    // 1. Calculate keyframe indices
    const idx0 = 0;

    let idx1 = 0;
    const tMid = tFlight * 0.5;
    let minDiff1 = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].t - tMid);
      if (diff < minDiff1) {
        minDiff1 = diff;
        idx1 = i;
      }
    }

    let idx2 = 0;
    let minDiff2 = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].t - tFlight);
      if (diff < minDiff2) {
        minDiff2 = diff;
        idx2 = i;
      }
    }

    let idx3 = idx2;
    let maxFz = -1;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].fzTotal > maxFz) {
        maxFz = frames[i].fzTotal;
        idx3 = i;
      }
    }

    const idx4 = frames.length - 1;

    state.playback.keyframeIndices = [idx0, idx1, idx2, idx3, idx4];

    // 2. Render each keyframe card
    for (let k = 0; k < 5; k++) {
      const frameIdx = state.playback.keyframeIndices[k];
      const f = frames[frameIdx];
      if (!f) continue;

      // Update text readouts
      const timeEl = document.getElementById(`kf-time-${k}`);
      if (timeEl) timeEl.textContent = `t = ${f.t.toFixed(3)} s`;

      const metricEl = document.getElementById(`kf-metrics-${k}`);
      if (metricEl) {
        const vMag = Math.hypot(f.comVx, f.comVy).toFixed(1);
        if (f.fzTotal > 0.1) {
          metricEl.textContent = `v = ${vMag} m/s · GRF = ${f.fzTotal.toFixed(1)} kN`;
        } else {
          metricEl.textContent = `v = ${vMag} m/s · Alt = ${Math.max(0, f.comY).toFixed(2)} m`;
        }
      }

      // Render mini-canvas
      const canvas = document.getElementById(`canvas-kf-${k}`);
      if (canvas) {
        renderMiniKeyframeCanvas(canvas, f, k);
      }
    }
  }

  function updateKeyframeHighlight() {
    const sim = state.simResult;
    if (!sim || !sim.frames || !state.playback.keyframeIndices) return;

    const curFrame = sim.frames[state.playback.currentFrame];
    if (!curFrame) return;

    const t = curFrame.t;
    const tFlight = sim.summary.flightTimeS;
    const kf = state.playback.keyframeIndices;
    const t0 = sim.frames[kf[0]]?.t || 0;
    const t1 = sim.frames[kf[1]]?.t || (tFlight * 0.5);
    const t2 = sim.frames[kf[2]]?.t || tFlight;
    const t3 = sim.frames[kf[3]]?.t || (tFlight + 0.03);
    const t4 = sim.frames[kf[4]]?.t || (tFlight + 0.35);

    let activeIdx = 0;
    if (t < (t0 + t1) * 0.5) {
      activeIdx = 0;
    } else if (t < (t1 + t2) * 0.5) {
      activeIdx = 1;
    } else if (t < (t2 + t3) * 0.5) {
      activeIdx = 2;
    } else if (t < (t3 + t4) * 0.5) {
      activeIdx = 3;
    } else {
      activeIdx = 4;
    }

    const cards = document.querySelectorAll('.keyframe-card');
    cards.forEach((card, idx) => {
      if (idx === activeIdx) {
        card.classList.add('active-phase');
      } else {
        card.classList.remove('active-phase');
      }
    });
  }

  function initKeyframeFilmstripEvents() {
    const cards = document.querySelectorAll('.keyframe-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const kfIdx = parseInt(card.dataset.keyframeIdx, 10);
        if (isNaN(kfIdx) || !state.playback.keyframeIndices) return;

        const targetFrameIdx = state.playback.keyframeIndices[kfIdx];
        const sim = state.simResult;
        if (!sim || !sim.frames || !sim.frames[targetFrameIdx]) return;

        pauseSimulation();
        state.playback.userScrubbed = true;
        state.playback.currentFrame = targetFrameIdx;
        state.playback.simTime = sim.frames[targetFrameIdx].t;

        if (dom.sliderTimeline) {
          dom.sliderTimeline.value = targetFrameIdx;
        }

        renderSimulationCanvas();
        updateKeyframeHighlight();
      });

      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  // ==========================================================================
  // 8. TAB 2: WEBM VIDEO EXPORT ENGINE
  // ==========================================================================
  async function startVideoExport() {
    const exportBtn = dom.btnExportVideo;
    if (state.recording.isRecording) return;

    const canvas = dom.canvasSimulation;
    if (!canvas || !state.simResult) return;

    pauseSimulation();

    // Determine supported WebM codec
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    let stream;
    try {
      stream = canvas.captureStream(60);
    } catch (e) {
      alert('Canvas captureStream is not supported in this environment: ' + e.message);
      return;
    }

    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
    } catch (e) {
      alert('MediaRecorder initialization failed: ' + e.message);
      return;
    }

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      state.recording.isRecording = false;
      if (exportBtn) {
        exportBtn.classList.remove('recording');
        exportBtn.innerHTML = '<span>🎥</span> Export WebM Animation';
      }

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LTU_EBL_Fall_Simulation_h${state.params.height.toFixed(1)}m.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    state.recording.isRecording = true;
    state.recording.mediaRecorder = recorder;

    if (exportBtn) {
      exportBtn.classList.add('recording');
      exportBtn.innerHTML = '<span>🔴</span> Recording (0%)...';
    }

    recorder.start();

    // Step through simulation frames sequentially
    const totalFrames = state.simResult.frames.length;
    let recIdx = 0;

    function recStep() {
      if (!state.recording.isRecording) return;

      if (recIdx >= totalFrames) {
        recorder.stop();
        return;
      }

      state.playback.currentFrame = recIdx;
      renderSimulationCanvas(true); // true = draw telemetry banner

      if (exportBtn) {
        const pct = Math.round((recIdx / totalFrames) * 100);
        exportBtn.innerHTML = `<span>🔴</span> Recording (${pct}%)...`;
      }

      recIdx++;
      requestAnimationFrame(recStep);
    }

    recIdx = 0;
    recStep();
  }

  // ==========================================================================
  // 9. TAB 3: ANATOMICAL INJURY HEAT-MAP & DIAGNOSTIC CARDS (ZERO TABLES!)
  // ==========================================================================
  function renderInjuryMapCanvas() {
    const canvas = dom.canvasInjuryMap;
    if (!canvas || !state.simResult) return;

    const { ctx, w, h } = setupHiDPICanvas(canvas);
    const segResults = state.simResult.segmentResults;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Anatomical Skeleton Layout
    // Skeleton placed in middle column: x in [w*0.35, w*0.65]
    const centerX = w * 0.5 + state.injuryView.panOffset.x;
    const centerY = h * 0.48 + state.injuryView.panOffset.y;
    const scale = (h / 430) * state.injuryView.zoomScale;

    function toScreen(x, y) {
      return {
        sx: centerX + x * scale,
        sy: centerY + y * scale
      };
    }

    state.injuryView.hitRegions = [];

    // Map segments to results
    const segMap = {};
    segResults.forEach(s => { segMap[s.id] = s; });

    function getSegmentColor(id) {
      const s = segMap[id];
      if (!s) return COLORS.safe;
      if (s.status === 'fracture') return COLORS.fracture;
      if (s.status === 'micro') return COLORS.micro;
      return COLORS.safe;
    }

    // Anatomical Nodes
    const nodes = {
      head: toScreen(0, -145),
      cervical: toScreen(0, -105),
      thorax: toScreen(0, -60),
      pelvis: toScreen(0, 0),
      // Left limb
      leftShoulder: toScreen(-35, -95),
      leftElbow: toScreen(-55, -40),
      leftWrist: toScreen(-68, 15),
      leftHip: toScreen(-20, 15),
      leftKnee: toScreen(-24, 85),
      leftAnkle: toScreen(-25, 155),
      leftFoot: toScreen(-15, 175),
      // Right limb
      rightShoulder: toScreen(35, -95),
      rightElbow: toScreen(55, -40),
      rightWrist: toScreen(68, 15),
      rightHip: toScreen(20, 15),
      rightKnee: toScreen(24, 85),
      rightAnkle: toScreen(25, 155),
      rightFoot: toScreen(15, 175)
    };

    // Draw Skeleton Bones with glowing hover highlight
    function drawSkeletonSegment(p1, p2, segId, width) {
      const col = getSegmentColor(segId);
      const isSelected = state.injuryView.selectedSegment === segId || state.injuryView.hoveredSegment === segId;

      ctx.strokeStyle = isSelected ? '#ffffff' : col;
      ctx.lineWidth = isSelected ? width + 3 : width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      // Register hit region
      state.injuryView.hitRegions.push({
        segId: segId,
        x1: Math.min(p1.sx, p2.sx) - 15,
        y1: Math.min(p1.sy, p2.sy) - 15,
        x2: Math.max(p1.sx, p2.sx) + 15,
        y2: Math.max(p1.sy, p2.sy) + 15
      });
    }

    // 1. Spine & Torso
    drawSkeletonSegment(nodes.head, nodes.cervical, 'neck', 7);
    drawSkeletonSegment(nodes.cervical, nodes.thorax, 'thorax', 14);
    drawSkeletonSegment(nodes.thorax, nodes.pelvis, 'lumbarPelvis', 15);

    // Rib cage contour arcs
    ctx.strokeStyle = getSegmentColor('thorax');
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const ry = nodes.thorax.sy + i * 8 * scale;
      ctx.beginPath();
      ctx.ellipse(nodes.thorax.sx, ry, 26 * scale, 7 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pelvic ring
    ctx.strokeStyle = getSegmentColor('lumbarPelvis');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(nodes.pelvis.sx, nodes.pelvis.sy, 18 * scale, 0, Math.PI);
    ctx.stroke();

    // 2. Cranium
    const headCol = getSegmentColor('head');
    const isHeadSelected = state.injuryView.selectedSegment === 'head' || state.injuryView.hoveredSegment === 'head';
    ctx.fillStyle = isHeadSelected ? '#ffffff' : headCol;
    ctx.beginPath();
    ctx.arc(nodes.head.sx, nodes.head.sy, 22 * scale, 0, Math.PI * 2);
    ctx.fill();

    state.injuryView.hitRegions.push({
      segId: 'head',
      x1: nodes.head.sx - 25,
      y1: nodes.head.sy - 25,
      x2: nodes.head.sx + 25,
      y2: nodes.head.sy + 25
    });

    // 3. Lower Extremities
    drawSkeletonSegment(nodes.leftHip, nodes.leftKnee, 'thigh', 11);
    drawSkeletonSegment(nodes.rightHip, nodes.rightKnee, 'thigh', 11);
    drawSkeletonSegment(nodes.leftKnee, nodes.leftAnkle, 'shank', 9);
    drawSkeletonSegment(nodes.rightKnee, nodes.rightAnkle, 'shank', 9);
    drawSkeletonSegment(nodes.leftAnkle, nodes.leftFoot, 'foot', 8);
    drawSkeletonSegment(nodes.rightAnkle, nodes.rightFoot, 'foot', 8);

    // 4. Upper Extremities
    drawSkeletonSegment(nodes.cervical, nodes.leftShoulder, 'upperArm', 5);
    drawSkeletonSegment(nodes.cervical, nodes.rightShoulder, 'upperArm', 5);
    drawSkeletonSegment(nodes.leftShoulder, nodes.leftElbow, 'upperArm', 8);
    drawSkeletonSegment(nodes.rightShoulder, nodes.rightElbow, 'upperArm', 8);
    drawSkeletonSegment(nodes.leftElbow, nodes.leftWrist, 'forearmHand', 7);
    drawSkeletonSegment(nodes.rightElbow, nodes.rightWrist, 'forearmHand', 7);

    // Joint dots
    ctx.fillStyle = '#ffffff';
    Object.values(nodes).forEach(n => {
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw Segment Callout Tags on Left & Right
    const callouts = [
      { id: 'head', label: 'Cranium & Skull Base', target: nodes.head, side: 'left', yOffset: -30 },
      { id: 'neck', label: 'Cervical Spine (C1-C7)', target: nodes.cervical, side: 'left', yOffset: 10 },
      { id: 'thorax', label: 'Thorax & Ribs', target: nodes.thorax, side: 'left', yOffset: 50 },
      { id: 'lumbarPelvis', label: 'Lumbar Spine & Pelvis', target: nodes.pelvis, side: 'left', yOffset: 90 },

      { id: 'upperArm', label: 'Humerus / Shoulder', target: nodes.rightShoulder, side: 'right', yOffset: -30 },
      { id: 'forearmHand', label: 'Radius & Wrist (FOOSH)', target: nodes.rightWrist, side: 'right', yOffset: 15 },
      { id: 'thigh', label: 'Femur & Hip Joint', target: nodes.rightHip, side: 'right', yOffset: 60 },
      { id: 'shank', label: 'Tibia, Fibula & Pilon', target: nodes.rightKnee, side: 'right', yOffset: 105 },
      { id: 'foot', label: 'Calcaneus (Don Juan)', target: nodes.rightFoot, side: 'right', yOffset: 150 }
    ];

    callouts.forEach(c => {
      const seg = segMap[c.id];
      if (!seg) return;

      const isLeft = c.side === 'left';
      const boxW = 165;
      const boxH = 34;
      const boxX = isLeft ? 15 : w - boxW - 15;
      const boxY = Math.max(10, Math.min(h - boxH - 10, c.target.sy + c.yOffset));

      // Pointer line
      const pointerEndX = isLeft ? boxX + boxW : boxX;
      const pointerEndY = boxY + boxH * 0.5;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.target.sx, c.target.sy);
      ctx.lineTo(pointerEndX, pointerEndY);
      ctx.stroke();

      // Card Box
      const isSelected = state.injuryView.selectedSegment === c.id || state.injuryView.hoveredSegment === c.id;
      ctx.fillStyle = isSelected ? '#1e293b' : 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isSelected ? '#38bdf8' : (seg.status === 'fracture' ? COLORS.fracture : (seg.status === 'micro' ? COLORS.micro : '#334155'));
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Title & Status
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(seg.shortName || seg.name, boxX + 6, boxY + 13);

      // Status pill badge
      let badgeCol = COLORS.safe;
      let badgeTxt = 'SAFE';
      if (seg.status === 'fracture') { badgeCol = COLORS.fracture; badgeTxt = 'FRACTURE'; }
      else if (seg.status === 'micro') { badgeCol = COLORS.micro; badgeTxt = 'MICRO'; }

      ctx.fillStyle = badgeCol;
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(badgeTxt, boxX + boxW - 6, boxY + 13);

      // Load vs. Tolerance
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Peak: ${seg.peakLoadKN.toFixed(1)} kN / ${seg.toleranceKN.toFixed(1)} kN`, boxX + 6, boxY + 26);

      // Register callout hit region
      state.injuryView.hitRegions.push({
        segId: c.id,
        x1: boxX,
        y1: boxY,
        x2: boxX + boxW,
        y2: boxY + boxH
      });
    });
  }

  function renderSegmentDiagnosticCards() {
    const container = dom.segmentCardsContainer;
    if (!container || !state.simResult) return;

    container.innerHTML = '';
    const segResults = state.simResult.segmentResults;

    segResults.forEach(seg => {
      const card = document.createElement('div');
      const statusClass = seg.status === 'fracture' ? 'status-fracture' : (seg.status === 'micro' ? 'status-micro' : 'status-safe');
      card.className = `segment-diag-card ${statusClass}`;
      card.setAttribute('data-segment', seg.id);

      if (state.injuryView.selectedSegment === seg.id) {
        card.classList.add('selected');
      }

      const pct = Math.round(seg.fractureIndex * 100);
      const barWidth = Math.min(100, pct);
      const badgeClass = seg.status === 'fracture' ? 'fracture' : (seg.status === 'micro' ? 'micro' : 'safe');
      const badgeText = seg.status === 'fracture'
        ? `Fracture (${pct}%)`
        : (seg.status === 'micro' ? `Microdamage (${pct}%)` : `Intact (${pct}%)`);

      card.innerHTML = `
        <div class="segment-card-top">
          <div class="segment-name-group">
            <span class="segment-name">${seg.name}</span>
          </div>
          <span class="segment-status-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="segment-metrics-row">
          <span>Peak Force: <strong>${seg.peakLoadKN.toFixed(2)} kN</strong> / ${seg.toleranceKN.toFixed(2)} kN</span>
          <span>Stress Ratio: <strong>${seg.fractureIndex.toFixed(2)}</strong></span>
          <span>AIS Risk: <strong>${seg.riskPercent.toFixed(1)}%</strong></span>
        </div>
        <div class="segment-progress-track">
          <div class="segment-progress-fill ${badgeClass}" style="width: ${barWidth}%;"></div>
        </div>
        <div class="segment-morphology-note">
          <strong>Mechanism:</strong> ${seg.mechanism}<br>
          <strong>Forensic Morphology:</strong> ${seg.forensicMorphology}
        </div>
      `;

      card.addEventListener('click', () => {
        state.injuryView.selectedSegment = seg.id;
        document.querySelectorAll('.segment-diag-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        renderInjuryMapCanvas();
      });

      container.appendChild(card);
    });
  }

  function updateForensicDiagnosisBanner() {
    if (!state.simResult) return;
    const sim = state.simResult;
    const sum = sim.summary;
    const p = state.params;

    // Regime pill
    if (dom.diagRegimePill) {
      if (sum.injuryRegime === 'regime-local') {
        dom.diagRegimePill.textContent = 'Regime I · Localized Extremity Trauma (1–3 m)';
        dom.diagRegimePill.style.color = '#7dd3fc';
      } else if (sum.injuryRegime === 'regime-axial') {
        dom.diagRegimePill.textContent = 'Regime II · Axial Deceleration & Bimodal Bifurcation (3–12 m)';
        dom.diagRegimePill.style.color = '#fde047';
      } else {
        dom.diagRegimePill.textContent = 'Regime III · Catastrophic Polytrauma (12–30+ m)';
        dom.diagRegimePill.style.color = '#fca5a5';
      }
    }

    // Primary Impact Site
    if (dom.diagPrimaryImpact) {
      dom.diagPrimaryImpact.textContent = `${sum.primaryImpactSegment} (Secondary Strike: ${sum.secondaryImpactSegment})`;
    }

    // Deceleration duration & pulse
    if (dom.diagPulseDuration) {
      dom.diagPulseDuration.textContent = `Impact Velocity = ${sum.impactVelocityMS.toFixed(1)} m/s · Peak GRF = ${sum.peakGRF_KN.toFixed(1)} kN · Peak Head Accel = ${sum.peakHeadG.toFixed(1)} g`;
    }

    // Dominant Fracture Morphology & HBL Assessment
    if (dom.diagFracturePattern) {
      dom.diagFracturePattern.textContent = sum.hatBrimLineAssessment;
    }

    // Forensic Classification & AIS Score
    if (dom.diagAisScore) {
      if (sum.overallMortalityRisk > 80) {
        dom.diagAisScore.textContent = `Catastrophic Polytrauma · Maximum AIS = 5–6 · Fatal Probability: ${sum.overallMortalityRisk}%`;
      } else if (sum.overallMortalityRisk > 40) {
        dom.diagAisScore.textContent = `Severe Polytrauma · Maximum AIS = 4 · High Lethality: ${sum.overallMortalityRisk}%`;
      } else if (sum.overallMortalityRisk > 15) {
        dom.diagAisScore.textContent = `Moderate Trauma · Maximum AIS = 3 · Survivable (Mortality: ${sum.overallMortalityRisk}%)`;
      } else {
        dom.diagAisScore.textContent = `Localized Minor/Moderate Trauma · Maximum AIS = 1–2 · High Survival (Mortality: ${sum.overallMortalityRisk}%)`;
      }
    }
  }

  // ==========================================================================
  // 10. TAB 3: 4 SYNCHRONIZED BIOMECHANICAL CHART.JS PLOTS
  // ==========================================================================
  function updateAnalysisCharts() {
    if (!window.Chart || !state.simResult) return;
    const sim = state.simResult;
    const ts = sim.timeSeries;
    const segs = sim.segmentResults;

    // Time-series downsample for crisp rendering
    const labels = ts.map(d => d.t.toFixed(3));

    // 1. Chart: Ground Reaction Force (GRF) vs. Time
    if (dom.chartGrf) {
      if (state.charts.grf) state.charts.grf.destroy();
      state.charts.grf = new Chart(dom.chartGrf.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Normal GRF Fz (kN)',
              data: ts.map(d => d.fzTotal),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              fill: true
            },
            {
              label: 'Tangential GRF Fx (kN)',
              data: ts.map(d => d.fxTotal),
              borderColor: '#f59e0b',
              borderWidth: 1.5,
              pointRadius: 0,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'Time (s)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 8 },
              grid: { color: '#e2e8f0' }
            },
            y: {
              title: { display: true, text: 'Force (kN)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 2. Chart: Segment Peak Force vs Fracture Yield Limits
    if (dom.chartSegments) {
      if (state.charts.segments) state.charts.segments.destroy();
      const segLabels = segs.map(s => s.shortName);
      const peakForces = segs.map(s => s.peakLoadKN);
      const tolerances = segs.map(s => s.toleranceKN);
      const barColors = segs.map(s => s.status === 'fracture' ? COLORS.fracture : (s.status === 'micro' ? COLORS.micro : COLORS.safe));

      state.charts.segments = new Chart(dom.chartSegments.getContext('2d'), {
        type: 'bar',
        data: {
          labels: segLabels,
          datasets: [
            {
              label: 'Peak Applied Load (kN)',
              data: peakForces,
              backgroundColor: barColors,
              borderRadius: 4
            },
            {
              label: 'Yield Limit (kN)',
              data: tolerances,
              backgroundColor: 'rgba(148, 163, 184, 0.45)',
              borderColor: '#64748b',
              borderWidth: 1,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              ticks: { color: '#64748b', font: { size: 9 } },
              grid: { display: false }
            },
            y: {
              title: { display: true, text: 'Force (kN)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 3. Chart: Head Acceleration & Axial Spine Force
    if (dom.chartHeadSpine) {
      if (state.charts.headSpine) state.charts.headSpine.destroy();
      state.charts.headSpine = new Chart(dom.chartHeadSpine.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Head Accel (g)',
              data: ts.map(d => d.headG),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              fill: true,
              yAxisID: 'yHead'
            },
            {
              label: 'Spine Axial Load (kN)',
              data: ts.map(d => (d.segLoads && d.segLoads.lumbarPelvis) ? d.segLoads.lumbarPelvis : 0),
              borderColor: '#0284c7',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              yAxisID: 'ySpine'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'Time (s)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 8 },
              grid: { color: '#e2e8f0' }
            },
            yHead: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Head Accel (g)', color: '#8b5cf6', font: { size: 10 } },
              ticks: { color: '#8b5cf6', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              beginAtZero: true
            },
            ySpine: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Spine Load (kN)', color: '#0284c7', font: { size: 10 } },
              ticks: { color: '#0284c7', font: { size: 9 } },
              grid: { drawOnChartArea: false },
              beginAtZero: true
            }
          }
        }
      });
    }

    // 4. Chart: System Energy Partitioning
    if (dom.chartEnergy) {
      if (state.charts.energy) state.charts.energy.destroy();
      state.charts.energy = new Chart(dom.chartEnergy.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Kinetic Energy Ek (J)',
              data: ts.map(d => d.ek),
              borderColor: '#0284c7',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2
            },
            {
              label: 'Potential Energy Ep (J)',
              data: ts.map(d => d.ep),
              borderColor: '#10b981',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2
            },
            {
              label: 'Dissipated Work Ediss (J)',
              data: ts.map(d => d.ediss),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.2,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'Time (s)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 8 },
              grid: { color: '#e2e8f0' }
            },
            y: {
              title: { display: true, text: 'Energy (Joules)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // ==========================================================================
  // 11. TAB 4: MULTI-HEIGHT BIMODAL EXPLORER (1–30m SWEEP)
  // ==========================================================================
  function runSweepCalculation() {
    readParamsFromInputs();

    const sweepParams = {
      angleDeg: state.params.angleDeg,
      vx: state.params.vx,
      vy: state.params.vy,
      omegaDeg: state.params.omegaDeg,
      mass: state.params.mass,
      stature: state.params.stature,
      surface: state.params.surface,
      stiffness: state.params.stiffness,
      damping: state.params.damping,
      tolerance: state.params.tolerance,
      bracing: state.params.bracing
    };

    state.sweepResult = Physics.runHeightSweep(sweepParams);
    state.isSweepDirty = false;
  }

  function highlightRegimeCard() {
    if (!dom.regimeSummaryCards) return;
    const h = state.params.height;

    dom.regimeSummaryCards.forEach(c => {
      c.style.transform = 'scale(1.0)';
      c.style.boxShadow = 'var(--shadow-sm)';
    });

    let targetClass = '.regime-local';
    if (h > 12.0) targetClass = '.regime-systemic';
    else if (h > 3.0) targetClass = '.regime-axial';

    const activeCard = document.querySelector ? document.querySelector(targetClass) : null;
    if (activeCard) {
      activeCard.style.transform = 'scale(1.02)';
      activeCard.style.boxShadow = '0 8px 16px -2px rgba(2, 132, 199, 0.25)';
    }
  }

  function updateSweepCharts() {
    if (!window.Chart || !state.sweepResult) return;
    const sweep = state.sweepResult;

    const labels = sweep.map(d => `${d.height}m`);

    // 1. Chart: Bimodal Injury Probability vs Fall Height
    if (dom.chartBimodalRisk) {
      if (state.charts.bimodalRisk) state.charts.bimodalRisk.destroy();
      state.charts.bimodalRisk = new Chart(dom.chartBimodalRisk.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cranial / Head Fracture Risk (%)',
              data: sweep.map(d => d.headRisk),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.10)',
              borderWidth: 2.5,
              tension: 0.3,
              fill: true,
              pointRadius: 2
            },
            {
              label: 'Lower Extremity Risk (%)',
              data: sweep.map(d => d.lowerExtRisk),
              borderColor: '#10b981',
              borderWidth: 2.5,
              tension: 0.3,
              pointRadius: 2
            },
            {
              label: 'Thoracolumbar Spine & Pelvis Risk (%)',
              data: sweep.map(d => d.spinePelvisRisk),
              borderColor: '#f59e0b',
              borderWidth: 2.5,
              tension: 0.3,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'Fall Height (m)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 15 },
              grid: { color: '#e2e8f0' }
            },
            y: {
              title: { display: true, text: 'Injury Probability (%)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              min: 0,
              max: 100
            }
          }
        }
      });
    }

    // 2. Chart: Impact Attitude Angle & Peak GRF vs Fall Height
    if (dom.chartBimodalAngle) {
      if (state.charts.bimodalAngle) state.charts.bimodalAngle.destroy();
      state.charts.bimodalAngle = new Chart(dom.chartBimodalAngle.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Impact Pitch Angle θ (deg)',
              data: sweep.map(d => d.impactAngleDeg),
              borderColor: '#8b5cf6',
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 2,
              yAxisID: 'yAngle'
            },
            {
              label: 'Peak GRF (kN)',
              data: sweep.map(d => d.peakGRF),
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              borderWidth: 2,
              tension: 0.25,
              fill: true,
              pointRadius: 2,
              yAxisID: 'yGRF'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#64748b', font: { size: 10 } } },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: {
              title: { display: true, text: 'Fall Height (m)', color: '#64748b', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9 }, maxTicksLimit: 15 },
              grid: { color: '#e2e8f0' }
            },
            yAngle: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Pitch Angle (deg)', color: '#8b5cf6', font: { size: 10 } },
              ticks: { color: '#8b5cf6', font: { size: 9 } },
              grid: { color: '#e2e8f0' },
              min: -180,
              max: 180
            },
            yGRF: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Peak GRF (kN)', color: '#0284c7', font: { size: 10 } },
              ticks: { color: '#0284c7', font: { size: 9 } },
              grid: { drawOnChartArea: false },
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // ==========================================================================
  // 12. CSV EXPORT ENGINE
  // ==========================================================================
  function exportSimulationCsv() {
    if (!state.simResult) runFullSimulation();
    const sim = state.simResult;
    const p = state.params;
    const sum = sim.summary;

    let csv = '# ============================================================================\n';
    csv += '# LTU EXPERIMENTAL BIOMECHANICS LAB · MSU FORENSIC ANTHROPOLOGY\n';
    csv += '# Interactive Multi-Body Dynamics Human Fall & Skeletal Fracture Simulator\n';
    csv += '# High-Resolution Kinematic, Kinetic & Forensic Trauma Time-Series Data Export\n';
    csv += '# ============================================================================\n';
    csv += `# Export Date,${new Date().toISOString()}\n`;
    csv += `# Fall Height (m),${p.height.toFixed(2)}\n`;
    csv += `# Initial Pitch Angle (deg),${p.angleDeg}\n`;
    csv += `# Horizontal Velocity vx0 (m/s),${p.vx.toFixed(2)}\n`;
    csv += `# Vertical Velocity vy0 (m/s),${p.vy.toFixed(2)}\n`;
    csv += `# Angular Velocity omega0 (rad/s),${p.omegaRad.toFixed(2)}\n`;
    csv += `# Subject Mass (kg),${p.mass}\n`;
    csv += `# Body Stature (m),${p.stature.toFixed(2)}\n`;
    csv += `# Neuromuscular Bracing (%),${Math.round(p.bracing * 100)}\n`;
    csv += `# Substrate Stiffness (kN/m),${p.stiffness}\n`;
    csv += `# Coefficient of Restitution,${p.restitution}\n`;
    csv += `# Bone Mineral Tolerance Index,${p.tolerance.toFixed(2)}\n#\n`;

    csv += '# ----------------------------------------------------------------------------\n';
    csv += '# SUMMARY FORENSIC METRICS\n';
    csv += '# ----------------------------------------------------------------------------\n';
    csv += `# Impact Velocity (m/s),${sum.impactVelocityMS.toFixed(2)}\n`;
    csv += `# Flight Duration (s),${sum.flightTimeS.toFixed(4)}\n`;
    csv += `# Peak GRF (kN),${sum.peakGRF_KN.toFixed(2)}\n`;
    csv += `# Head Injury Criterion (HIC15),${sum.hic15.toFixed(1)}\n`;
    csv += `# Peak Head Acceleration (g),${sum.peakHeadG.toFixed(1)}\n`;
    csv += `# Primary Impact Segment,"${sum.primaryImpactSegment}"\n`;
    csv += `# Secondary Impact Segment,"${sum.secondaryImpactSegment}"\n`;
    csv += `# Forensic Trauma Regime,"${sum.injuryRegime}"\n`;
    csv += `# Fracture Count,${sum.fractureCount}\n`;
    csv += `# Overall Mortality Risk (%),${sum.overallMortalityRisk}\n`;
    csv += `# Hat Brim Line Assessment,"${sum.hatBrimLineAssessment}"\n#\n`;

    csv += '# ----------------------------------------------------------------------------\n';
    csv += '# SEGMENTAL FRACTURE DIAGNOSTICS\n';
    csv += '# ----------------------------------------------------------------------------\n';
    csv += 'Segment ID,Segment Name,Peak Load (kN),Yield Tolerance (kN),Fracture Index,AIS Probability (%),Status,Mechanism,Forensic Morphology\n';
    sim.segmentResults.forEach(s => {
      csv += `"${s.id}","${s.name}",${s.peakLoadKN.toFixed(2)},${s.toleranceKN.toFixed(2)},${s.fractureIndex.toFixed(2)},${s.riskPercent.toFixed(1)},"${s.status}","${s.mechanism}","${s.forensicMorphology}"\n`;
    });
    csv += '#\n';

    csv += '# ----------------------------------------------------------------------------\n';
    csv += '# TIME-SERIES KINEMATICS & GROUND REACTION FORCES\n';
    csv += '# ----------------------------------------------------------------------------\n';
    csv += 'Time (s),GRF Fz (kN),GRF Fx (kN),Head Accel (g),Potential Energy (J),Kinetic Energy (J),Dissipated Work (J),Head Load (kN),Neck Load (kN),Thorax Load (kN),LumbarPelvis Load (kN),UpperArm Load (kN),ForearmHand Load (kN),Thigh Load (kN),Shank Load (kN),Foot Load (kN)\n';

    sim.timeSeries.forEach(t => {
      const sl = t.segLoads || {};
      csv += `${t.t.toFixed(4)},${t.fzTotal.toFixed(2)},${t.fxTotal.toFixed(2)},${t.headG.toFixed(1)},${t.ep.toFixed(1)},${t.ek.toFixed(1)},${t.ediss.toFixed(1)},${sl.head || 0},${sl.neck || 0},${sl.thorax || 0},${sl.lumbarPelvis || 0},${sl.upperArm || 0},${sl.forearmHand || 0},${sl.thigh || 0},${sl.shank || 0},${sl.foot || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LTU_EBL_Fall_Kinetics_h${p.height.toFixed(1)}m.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // 13. FORENSIC QUIZ & MODAL CONTROLLERS
  // ==========================================================================
  const QUIZ_RATIONALES = {
    1: {
      correct: 'Correct! Under Newtonian ballistics, a fall of 12.0 meters requires t = √(2h/g) = √(24 / 9.81) ≈ 1.56 seconds. A horizontal clearance of 4.2 m gives vx = 4.2 / 1.56 ≈ 2.69 m/s. Passive slips typically produce vx < 0.5–1.0 m/s; vx > 2.5 m/s requires an active sprint, running vault, or powerful external push.',
      incorrect: 'Incorrect. Calculate initial velocity via ballistics: t = √(2h/g) = √(24 / 9.81) ≈ 1.56 s. Then vx = d / t = 4.2 m / 1.56 s ≈ 2.7 m/s. An initial horizontal speed of 2.7 m/s strongly discriminates against accidental passive slips (vx < 1 m/s) and indicates energetic propulsion or homicidal push.'
    },
    2: {
      correct: 'Correct! A circumferential ring fracture around the foramen magnum in the absence of direct calvarial impact is pathognomonic of indirect axial deceleration transmitted vertically through the spinal column forcing the occipital condyles into the cranial base during feet- or buttocks-first landing.',
      incorrect: 'Incorrect. Circumferential ring fractures around the foramen magnum without vault strike occur via massive axial shock conduction up the vertebral axis into the occipital condyles (or driven downward onto the cervical spine in vertex impact).'
    },
    3: {
      correct: 'Correct! In Regime II (3.1–12 m), mid-air flight duration (0.8–1.6 s) allows 0.5 to 1.5 somersault rotations. Feet-first landings utilize lower-limb articular compliance and calcaneal crush to attenuate energy, whereas head/torso-first landings circumvent this compliance, delivering catastrophic deceleration directly to the skull and viscera.',
      incorrect: 'Incorrect. The bimodal trauma distribution in Regime II arises because mid-air somersault pitch can lock into either feet-first impact (lower extremity compliance attenuating spinal shock) or inverted/torso-first impact (direct cranial/visceral destruction).'
    },
    4: {
      correct: 'Correct! Severe osteoporotic bone loss (T = 0.40) reduces cortical thickness and trabecular connectivity, dropping the femoral neck yield threshold below 3.0 kN. A simple lateral hip strike during a ground-level trip easily exceeds this reduced limit.',
      incorrect: 'Incorrect. In severe osteoporosis (T = 0.40), the structural yield limit of the femoral neck drops precipitously below 3.0 kN, allowing even modest ground impact forces (3–4 kN) from a ground-level slip to cause complete femoral neck fractures.'
    }
  };

  function setupQuizInteractions() {
    const questions = document.querySelectorAll('.quiz-question-card');
    questions.forEach(card => {
      const qNum = card.dataset.q;
      const options = card.querySelectorAll('.quiz-option-btn');
      const feedback = card.querySelector('.quiz-feedback');

      options.forEach(opt => {
        opt.addEventListener('click', () => {
          const isCorrect = opt.dataset.correct === 'true';

          // Reset styles
          options.forEach(o => {
            o.classList.remove('selected-correct', 'selected-incorrect');
          });

          if (isCorrect) {
            opt.classList.add('selected-correct');
            if (feedback && QUIZ_RATIONALES[qNum]) {
              feedback.className = 'quiz-feedback correct';
              feedback.innerHTML = `<strong>Forensic Diagnosis:</strong> ${QUIZ_RATIONALES[qNum].correct}`;
            }
          } else {
            opt.classList.add('selected-incorrect');
            // Highlight the true answer
            options.forEach(o => {
              if (o.dataset.correct === 'true') o.classList.add('selected-correct');
            });
            if (feedback && QUIZ_RATIONALES[qNum]) {
              feedback.className = 'quiz-feedback incorrect';
              feedback.innerHTML = `<strong>Correction:</strong> ${QUIZ_RATIONALES[qNum].incorrect}`;
            }
          }
        });
      });
    });
  }

  function setupModals() {
    // Theory Modal
    if (dom.btnTheory && dom.modalTheory) {
      dom.btnTheory.addEventListener('click', () => {
        dom.modalTheory.classList.add('active');
        if (window.renderMathInElement) {
          window.renderMathInElement(dom.modalTheory, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });
        }
      });
    }

    if (dom.btnCloseTheoryModal && dom.modalTheory) {
      dom.btnCloseTheoryModal.addEventListener('click', () => {
        dom.modalTheory.classList.remove('active');
      });
    }

    if (dom.modalTheory) {
      dom.modalTheory.addEventListener('click', e => {
        if (e.target === dom.modalTheory) dom.modalTheory.classList.remove('active');
      });
    }

    // Quiz Modal
    if (dom.btnQuiz && dom.modalQuiz) {
      dom.btnQuiz.addEventListener('click', () => {
        dom.modalQuiz.classList.add('active');
      });
    }

    if (dom.btnCloseQuizModal && dom.modalQuiz) {
      dom.btnCloseQuizModal.addEventListener('click', () => {
        dom.modalQuiz.classList.remove('active');
      });
    }

    if (dom.modalQuiz) {
      dom.modalQuiz.addEventListener('click', e => {
        if (e.target === dom.modalQuiz) dom.modalQuiz.classList.remove('active');
      });
    }
  }

  // ==========================================================================
  // 14. EVENT LISTENERS SETUP
  // ==========================================================================
  function wireEventListeners() {
    // 1. Sliders in Tab 1
    const sliders = [
      dom.sliderHeight, dom.sliderAngle, dom.sliderVx, dom.sliderVy,
      dom.sliderOmega, dom.sliderBracing, dom.sliderMass, dom.sliderStature,
      dom.sliderSurfaceStiffness, dom.sliderSurfaceDamping, dom.sliderInjuryTolerance
    ];

    sliders.forEach(slider => {
      if (!slider) return;
      slider.addEventListener('input', () => {
        readParamsFromInputs();
        updateBadgesAndMetrics();
        renderSetupPreviewCanvas();
      });
    });

    // 2. Preset Buttons in Tab 1
    if (dom.presetButtons) {
      dom.presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const pKey = btn.dataset.preset;
          applyPreset(pKey);
        });
      });
    }

    // 3. Tab Navigation Buttons
    if (dom.tabBtnSetup) dom.tabBtnSetup.addEventListener('click', () => switchTab('setup'));
    if (dom.tabBtnSimulate) dom.tabBtnSimulate.addEventListener('click', () => switchTab('simulate'));
    if (dom.tabBtnAnalysis) dom.tabBtnAnalysis.addEventListener('click', () => switchTab('analysis'));
    if (dom.tabBtnSweep) dom.tabBtnSweep.addEventListener('click', () => switchTab('sweep'));

    // Step progression buttons
    if (dom.btnRunToSim) dom.btnRunToSim.addEventListener('click', () => switchTab('simulate'));
    if (dom.btnNavBackToSetup) dom.btnNavBackToSetup.addEventListener('click', () => switchTab('setup'));
    if (dom.btnNavFwdToAnalysis) dom.btnNavFwdToAnalysis.addEventListener('click', () => switchTab('analysis'));
    if (dom.btnNavFwdToSweep) dom.btnNavFwdToSweep.addEventListener('click', () => switchTab('sweep'));

    // 4. Tab 1 Setup Preview Canvas Controls
    if (dom.btnSetupSagittal) {
      dom.btnSetupSagittal.addEventListener('click', () => {
        state.setupView.panOffset = { x: 0, y: 0 };
        state.setupView.zoomScale = 1.0;
        dom.btnSetupSagittal.classList.add('active');
        if (dom.btnSetupFit) dom.btnSetupFit.classList.remove('active');
        renderSetupPreviewCanvas();
      });
    }

    if (dom.btnSetupFit) {
      dom.btnSetupFit.addEventListener('click', () => {
        state.setupView.panOffset = { x: 0, y: 0 };
        state.setupView.zoomScale = 0.85;
        dom.btnSetupFit.classList.add('active');
        if (dom.btnSetupSagittal) dom.btnSetupSagittal.classList.remove('active');
        renderSetupPreviewCanvas();
      });
    }

    if (dom.btnSetupResetCam) {
      dom.btnSetupResetCam.addEventListener('click', () => {
        state.setupView.panOffset = { x: 0, y: 0 };
        state.setupView.zoomScale = 1.0;
        renderSetupPreviewCanvas();
      });
    }

    if (dom.btnSetupZoomIn) {
      dom.btnSetupZoomIn.addEventListener('click', () => {
        state.setupView.zoomScale *= 1.25;
        renderSetupPreviewCanvas();
      });
    }

    if (dom.btnSetupZoomOut) {
      dom.btnSetupZoomOut.addEventListener('click', () => {
        state.setupView.zoomScale = Math.max(0.3, state.setupView.zoomScale / 1.25);
        renderSetupPreviewCanvas();
      });
    }

    if (dom.btnSetupPanReset) {
      dom.btnSetupPanReset.addEventListener('click', () => {
        state.setupView.panOffset = { x: 0, y: 0 };
        state.setupView.zoomScale = 1.0;
        renderSetupPreviewCanvas();
      });
    }

    // Setup Canvas Drag / Pan
    if (dom.canvasSetupPreview) {
      dom.canvasSetupPreview.addEventListener('mousedown', e => {
        state.setupView.isDragging = true;
        state.setupView.dragStart = { x: e.clientX - state.setupView.panOffset.x, y: e.clientY - state.setupView.panOffset.y };
      });

      window.addEventListener('mousemove', e => {
        if (!state.setupView.isDragging) return;
        state.setupView.panOffset.x = e.clientX - state.setupView.dragStart.x;
        state.setupView.panOffset.y = e.clientY - state.setupView.dragStart.y;
        renderSetupPreviewCanvas();
      });

      window.addEventListener('mouseup', () => {
        state.setupView.isDragging = false;
      });

      dom.canvasSetupPreview.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        state.setupView.zoomScale = Math.max(0.2, Math.min(5.0, state.setupView.zoomScale * factor));
        renderSetupPreviewCanvas();
      }, { passive: false });
    }

    // 5. Tab 2 Simulation Controls
    if (dom.btnPlayPause) {
      dom.btnPlayPause.addEventListener('click', handlePlayPauseClick);
    }

    if (dom.btnSimRestart) {
      dom.btnSimRestart.addEventListener('click', restartSimulation);
    }

    if (dom.btnStepBack) {
      dom.btnStepBack.addEventListener('click', () => stepFrame(-5));
    }

    if (dom.btnStepFwd) {
      dom.btnStepFwd.addEventListener('click', () => stepFrame(5));
    }

    if (dom.selectSimSpeed) {
      dom.selectSimSpeed.addEventListener('change', () => {
        state.playback.speed = parseFloat(dom.selectSimSpeed.value) || 1.0;
      });
    }

    // Camera Modes
    const camButtons = [
      { mode: 'follow', btn: dom.btnCamFollow },
      { mode: 'fixed', btn: dom.btnCamFixed },
      { mode: 'ground', btn: dom.btnCamGround }
    ];

    camButtons.forEach(c => {
      if (!c.btn) return;
      c.btn.addEventListener('click', () => {
        state.playback.cameraMode = c.mode;
        camButtons.forEach(b => { if (b.btn) b.btn.classList.remove('active'); });
        c.btn.classList.add('active');
        renderSimulationCanvas();
      });
    });

    if (dom.btnSimZoomIn) {
      dom.btnSimZoomIn.addEventListener('click', () => {
        state.playback.zoomScale *= 1.25;
        renderSimulationCanvas();
      });
    }

    if (dom.btnSimZoomOut) {
      dom.btnSimZoomOut.addEventListener('click', () => {
        state.playback.zoomScale = Math.max(0.25, state.playback.zoomScale / 1.25);
        renderSimulationCanvas();
      });
    }

    if (dom.btnSimRecenter) {
      dom.btnSimRecenter.addEventListener('click', () => {
        state.playback.panOffset = { x: 0, y: 0 };
        state.playback.zoomScale = 1.0;
        renderSimulationCanvas();
      });
    }

    // Timeline Scrubber
    if (dom.sliderTimeline) {
      dom.sliderTimeline.addEventListener('input', () => {
        pauseSimulation();
        state.playback.userScrubbed = true;
        state.playback.currentFrame = parseInt(dom.sliderTimeline.value, 10) || 0;
        if (state.simResult && state.simResult.frames[state.playback.currentFrame]) {
          state.playback.simTime = state.simResult.frames[state.playback.currentFrame].t;
        }
        renderSimulationCanvas();
        updateKeyframeHighlight();
      });
    }

    // Keyframe filmstrip card click and keyboard events
    initKeyframeFilmstripEvents();

    // Overlay checkboxes
    [dom.chkShowCom, dom.chkShowGrf, dom.chkShowTrajectory, dom.chkShowStressColors].forEach(chk => {
      if (!chk) return;
      chk.addEventListener('change', () => renderSimulationCanvas());
    });

    // Simulation Canvas Drag / Pan
    if (dom.canvasSimulation) {
      dom.canvasSimulation.addEventListener('mousedown', e => {
        state.playback.isDragging = true;
        state.playback.dragStart = { x: e.clientX - state.playback.panOffset.x, y: e.clientY - state.playback.panOffset.y };
      });

      window.addEventListener('mousemove', e => {
        if (!state.playback.isDragging) return;
        state.playback.panOffset.x = e.clientX - state.playback.dragStart.x;
        state.playback.panOffset.y = e.clientY - state.playback.dragStart.y;
        renderSimulationCanvas();
      });

      window.addEventListener('mouseup', () => {
        state.playback.isDragging = false;
      });

      dom.canvasSimulation.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        state.playback.zoomScale = Math.max(0.2, Math.min(6.0, state.playback.zoomScale * factor));
        renderSimulationCanvas();
      }, { passive: false });
    }

    // Video Export Button
    if (dom.btnExportVideo) {
      dom.btnExportVideo.addEventListener('click', startVideoExport);
    }

    // 6. Tab 3 Injury Map Canvas Controls & Hover/Click
    if (dom.btnInjuryZoomIn) {
      dom.btnInjuryZoomIn.addEventListener('click', () => {
        state.injuryView.zoomScale *= 1.25;
        renderInjuryMapCanvas();
      });
    }

    if (dom.btnInjuryZoomOut) {
      dom.btnInjuryZoomOut.addEventListener('click', () => {
        state.injuryView.zoomScale = Math.max(0.4, state.injuryView.zoomScale / 1.25);
        renderInjuryMapCanvas();
      });
    }

    if (dom.btnInjuryRecenter) {
      dom.btnInjuryRecenter.addEventListener('click', () => {
        state.injuryView.panOffset = { x: 0, y: 0 };
        state.injuryView.zoomScale = 1.0;
        state.injuryView.selectedSegment = null;
        renderInjuryMapCanvas();
      });
    }

    if (dom.canvasInjuryMap) {
      dom.canvasInjuryMap.addEventListener('mousemove', e => {
        const rect = dom.canvasInjuryMap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Check hit regions
        let found = null;
        for (const hr of state.injuryView.hitRegions) {
          if (mx >= hr.x1 && mx <= hr.x2 && my >= hr.y1 && my <= hr.y2) {
            found = hr.segId;
            break;
          }
        }

        if (found !== state.injuryView.hoveredSegment) {
          state.injuryView.hoveredSegment = found;
          dom.canvasInjuryMap.style.cursor = found ? 'pointer' : 'default';
          renderInjuryMapCanvas();
        }
      });

      dom.canvasInjuryMap.addEventListener('click', e => {
        const rect = dom.canvasInjuryMap.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        for (const hr of state.injuryView.hitRegions) {
          if (mx >= hr.x1 && mx <= hr.x2 && my >= hr.y1 && my <= hr.y2) {
            state.injuryView.selectedSegment = hr.segId;
            renderInjuryMapCanvas();

            // Highlight and scroll into view the diagnostic card
            const targetCard = document.querySelector(`.segment-diag-card[data-segment="${hr.segId}"]`);
            if (targetCard) {
              document.querySelectorAll('.segment-diag-card').forEach(c => c.classList.remove('selected'));
              targetCard.classList.add('selected');
              targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            break;
          }
        }
      });
    }

    // 7. Tab 4 Sweep Execution Button
    if (dom.btnRunSweep) {
      dom.btnRunSweep.addEventListener('click', () => {
        runSweepCalculation();
        updateSweepCharts();
        highlightRegimeCard();
      });
    }

    // 8. Header Global Actions
    if (dom.btnExportCsv) {
      dom.btnExportCsv.addEventListener('click', exportSimulationCsv);
    }

    if (dom.btnReset) {
      dom.btnReset.addEventListener('click', () => {
        applyPreset('trip');
        switchTab('setup');
      });
    }

    // Window resize handler
    window.addEventListener('resize', () => {
      if (state.activeTab === 'setup') renderSetupPreviewCanvas();
      else if (state.activeTab === 'simulate') renderSimulationCanvas();
      else if (state.activeTab === 'analysis') {
        renderInjuryMapCanvas();
        if (state.charts.grf) state.charts.grf.resize();
        if (state.charts.segments) state.charts.segments.resize();
        if (state.charts.headSpine) state.charts.headSpine.resize();
        if (state.charts.energy) state.charts.energy.resize();
      } else if (state.activeTab === 'sweep') {
        if (state.charts.bimodalRisk) state.charts.bimodalRisk.resize();
        if (state.charts.bimodalAngle) state.charts.bimodalAngle.resize();
      }
    });
  }

  // ==========================================================================
  // 15. INITIALIZATION ON DOM READY
  // ==========================================================================
  function initApp() {
    queryElements();
    setupModals();
    setupQuizInteractions();
    wireEventListeners();

    // Read initial slider values
    readParamsFromInputs();
    updateBadgesAndMetrics();

    // Run baseline simulation
    runFullSimulation();

    // Render Tab 1 Setup Preview
    renderSetupPreviewCanvas();

    // Trigger KaTeX mathematical typesetting on initial page content
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX auto-render note:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Export public interface for debugging and integration testing
  window.EBLFallSimulatorApp = {
    getState: () => state,
    switchTab,
    applyPreset,
    runFullSimulation,
    exportSimulationCsv
  };

})();
