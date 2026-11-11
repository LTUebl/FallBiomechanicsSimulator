/**
 * ============================================================================
 * LTU Experimental Biomechanics Lab · MSU Forensic Anthropology Collaborative
 * Interactive Multi-Body Dynamics (MBD) Human Fall & Skeletal Fracture Simulator
 * 
 * physics.js - Core Multi-Body Physics, Anthropometrics, Viscoelastic Contact,
 *              Internal Axial Conduction & Forensic Fracture Tolerance Engine
 * 
 * Global Namespace: window.EBLFallPhysics
 * ============================================================================
 */

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EBLFallPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // ==========================================================================
  // 1. SURFACE PRESETS (SURFACE_PRESETS)
  // ==========================================================================
  const SURFACE_PRESETS = {
    concrete: {
      name: 'Rigid Concrete / Steel',
      k: 5000,
      c: 45,
      mu: 0.75,
      color: '#64748b',
      desc: 'Minimal deformation, very high peak GRF spike (5-15 ms)'
    },
    asphalt: {
      name: 'Asphalt / Pavement',
      k: 2500,
      c: 55,
      mu: 0.70,
      color: '#475569',
      desc: 'High stiffness roadway/sidewalk surface'
    },
    wood: {
      name: 'Hardwood / Structural Floor',
      k: 800,
      c: 65,
      mu: 0.55,
      color: '#b45309',
      desc: 'Moderate structural deflection and energy absorption'
    },
    soil: {
      name: 'Compacted Soil / Turf',
      k: 300,
      c: 85,
      mu: 0.65,
      color: '#15803d',
      desc: 'Significant plastic soil deformation, attenuated GRF peak'
    },
    mat: {
      name: 'Compliant Safety Foam / Mat',
      k: 80,
      c: 95,
      mu: 0.50,
      color: '#0284c7',
      desc: 'High compliance, prolonged deceleration pulse (>40 ms)'
    }
  };

  // ==========================================================================
  // 2. TISSUE TOLERANCE & AGING DEGENERATION PROFILES (TOLERANCE_PROFILES)
  // ==========================================================================
  const TOLERANCE_PROFILES = {
    fragile: {
      id: 'fragile',
      toleranceIndex: 0.40,
      name: 'Fragile / Severe Osteoporotic (Elderly)',
      desc: 'Severe bone mineral loss; fractures under low-energy domestic falls'
    },
    osteopenic: {
      id: 'osteopenic',
      toleranceIndex: 0.72,
      name: 'Mild Osteopenia / Aging Adult',
      desc: 'Age-related cortical thinning; intermediate fracture vulnerability'
    },
    average: {
      id: 'average',
      toleranceIndex: 1.00,
      name: 'Average Healthy Adult (Baseline PMHS)',
      desc: 'Calibrated baseline PMHS reference values (50th percentile)'
    },
    athletic: {
      id: 'athletic',
      toleranceIndex: 1.30,
      name: 'Athletic / High BMD Young Adult',
      desc: 'High bone mineral density, maximum structural strain tolerance'
    }
  };

  // ==========================================================================
  // 3. CURATED FORENSIC SCENARIO PRESETS (SCENARIO_PRESETS)
  // ==========================================================================
  const SCENARIO_PRESETS = {
    low_slip: {
      id: 'low_slip',
      title: 'Low Backward Slip (1.5 m)',
      subtitle: 'Ground/step slip · High cranial HBL risk',
      height: 1.5,
      angleDeg: -28,
      vx: -0.8,
      vy: 0.0,
      omegaDeg: -115,
      mass: 75,
      stature: 1.75,
      surface: 'concrete',
      stiffness: 5000,
      damping: 45,
      tolerance: 1.00,
      bracing: 0.15
    },
    ledge_trip: {
      id: 'ledge_trip',
      title: '1st-Story Forward Trip (3.5 m)',
      subtitle: 'Forward pitch · Cranial & upper limb impact',
      height: 3.5,
      angleDeg: 35,
      vx: 1.8,
      vy: 0.0,
      omegaDeg: 95,
      mass: 78,
      stature: 1.78,
      surface: 'concrete',
      stiffness: 5000,
      damping: 45,
      tolerance: 1.00,
      bracing: 0.60
    },
    mid_feet: {
      id: 'mid_feet',
      title: 'Intermediate Feet-First (9.0 m)',
      subtitle: '3rd story · Axial conduction (Calcaneus & T12-L1)',
      height: 9.0,
      angleDeg: 4,
      vx: 0.6,
      vy: 0.0,
      omegaDeg: 8,
      mass: 75,
      stature: 1.75,
      surface: 'concrete',
      stiffness: 5000,
      damping: 45,
      tolerance: 1.00,
      bracing: 0.50
    },
    mid_tumble: {
      id: 'mid_tumble',
      title: 'Intermediate Pitch & Fold (12.0 m)',
      subtitle: '4th story · Pelvic/back impact & spinal folding',
      height: 12.0,
      angleDeg: 20,
      vx: 1.4,
      vy: 0.0,
      omegaDeg: 65,
      mass: 75,
      stature: 1.75,
      surface: 'asphalt',
      stiffness: 2500,
      damping: 55,
      tolerance: 1.00,
      bracing: 0.30
    },
    high_balcony: {
      id: 'high_balcony',
      title: 'High Balcony Fall (20.0 m)',
      subtitle: '6th story · Systemic composite + secondary head slap',
      height: 20.0,
      angleDeg: 12,
      vx: 2.2,
      vy: 0.0,
      omegaDeg: 35,
      mass: 80,
      stature: 1.80,
      surface: 'concrete',
      stiffness: 5000,
      damping: 45,
      tolerance: 1.00,
      bracing: 0.25
    },
    fragile_fall: {
      id: 'fragile_fall',
      title: 'Fragile Standing Fall (1.2 m)',
      subtitle: 'Osteoporotic (τ=0.40) · Hip, pelvis & wrist fracture',
      height: 1.2,
      angleDeg: -40,
      vx: -0.5,
      vy: 0.0,
      omegaDeg: -85,
      mass: 64,
      stature: 1.65,
      surface: 'wood',
      stiffness: 800,
      damping: 65,
      tolerance: 0.40,
      bracing: 0.10
    }
  };

  // ==========================================================================
  // 4. 9-SEGMENT ANATOMICAL DEFINITIONS & ANTHROPOMETRIC SCALING
  // ==========================================================================
  const SEGMENT_DEFINITIONS = [
    {
      id: 'head',
      name: 'Cranium & Skull Base',
      shortName: 'Cranium',
      massFraction: 0.081,
      lengthFraction: 0.130,
      baselineTolerance: 5.2,
      forensicMorphology: 'Linear calvarial vault fracture, depressed cranial fracture, basilar skull fracture (hinge/ring fracture around foramen magnum).'
    },
    {
      id: 'neck',
      name: 'Cervical Spine (C1-C7)',
      shortName: 'C-Spine',
      massFraction: 0.024,
      lengthFraction: 0.052,
      baselineTolerance: 3.2,
      forensicMorphology: 'Atlanto-axial dislocation, hyperextension tear-drop fracture, C5-C7 burst or subluxation.'
    },
    {
      id: 'thorax',
      name: 'Thorax & Rib Cage (T1-T10)',
      shortName: 'Thorax',
      massFraction: 0.216,
      lengthFraction: 0.170,
      baselineTolerance: 4.2,
      forensicMorphology: 'Serial bilateral rib fractures (flail chest), sternal fracture, pulmonary contusion / hemothorax.'
    },
    {
      id: 'lumbarPelvis',
      name: 'Thoracolumbar Spine (T12-L1) & Pelvis',
      shortName: 'T12-L1 & Pelvis',
      massFraction: 0.235,
      lengthFraction: 0.145,
      baselineTolerance: 4.6,
      forensicMorphology: 'T12-L1 Chance/burst compression fracture with canal retropulsion, vertical pelvic ring shear, sacroiliac disruption.'
    },
    {
      id: 'upperArm',
      name: 'Humerus / Shoulder Complex',
      shortName: 'Humerus',
      massFraction: 0.056,
      lengthFraction: 0.186,
      baselineTolerance: 2.8,
      forensicMorphology: 'Proximal humerus surgical neck fracture, humeral shaft spiral/comminuted fracture.'
    },
    {
      id: 'forearmHand',
      name: 'Forearm & Wrist (Radius / Ulna)',
      shortName: 'Radius & Wrist',
      massFraction: 0.044,
      lengthFraction: 0.190,
      baselineTolerance: 2.1,
      forensicMorphology: 'Colles / Smith distal radius fracture with dorsal comminution, scaphoid fracture (FOOSH mechanism).'
    },
    {
      id: 'thigh',
      name: 'Femur (Neck & Shaft)',
      shortName: 'Femur',
      massFraction: 0.200,
      lengthFraction: 0.245,
      baselineTolerance: 5.5,
      forensicMorphology: 'Subcapital femoral neck fracture, intertrochanteric comminution, femoral diaphysis transverse fracture.'
    },
    {
      id: 'shank',
      name: 'Tibia, Fibula & Pilon',
      shortName: 'Tibia-Fibula',
      massFraction: 0.093,
      lengthFraction: 0.246,
      baselineTolerance: 5.8,
      forensicMorphology: 'Bicondylar tibial plateau split-depression, mid-shaft comminuted tibia/fibula fracture, distal tibial pilon fracture.'
    },
    {
      id: 'foot',
      name: 'Calcaneus & Hindfoot Complex',
      shortName: 'Calcaneus',
      massFraction: 0.051,
      lengthFraction: 0.065,
      baselineTolerance: 5.4,
      forensicMorphology: "Bilateral intra-articular calcaneus fractures (Lover's / Don Juan fracture) with subtalar joint depression, talar neck fracture."
    }
  ];

  /**
   * Scales segment masses, lengths, and bone tolerances according to Dempster (1955),
   * Winter (2009), and allometric bone cross-sectional area scaling:
   *   toleranceKN = baselineTolerance * toleranceIndex * (mass / 75.0)^0.67
   */
  function computeAnthropometrics(mass, stature, toleranceIndex) {
    const m = Math.max(35, Math.min(180, Number(mass) || 75.0));
    const h = Math.max(1.20, Math.min(2.30, Number(stature) || 1.75));
    const tau = Math.max(0.20, Math.min(1.60, Number(toleranceIndex) != null ? Number(toleranceIndex) : 1.00));

    // Allometric bone cross-sectional scaling: proportional to body mass^(2/3)
    const massScale = Math.pow(m / 75.0, 0.67);
    const tolScale = tau * massScale;

    const segments = {};
    const segmentsList = [];

    for (const def of SEGMENT_DEFINITIONS) {
      const segMass = m * def.massFraction;
      const segLen = h * def.lengthFraction;
      const tolKN = def.baselineTolerance * tolScale;

      const segData = {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        massFraction: def.massFraction,
        lengthFraction: def.lengthFraction,
        mass: Number(segMass.toFixed(3)),
        length: Number(segLen.toFixed(3)),
        baselineToleranceKN: def.baselineTolerance,
        toleranceKN: Number(tolKN.toFixed(2)),
        forensicMorphology: def.forensicMorphology
      };

      segments[def.id] = segData;
      segmentsList.push(segData);
    }

    return {
      mass: m,
      stature: h,
      toleranceIndex: tau,
      massScale: Number(massScale.toFixed(4)),
      tolScale: Number(tolScale.toFixed(4)),
      segments,
      segmentsList
    };
  }

  // ==========================================================================
  // 5. INTERNAL BIOMECHANICAL MODEL & JOINT LINKAGE
  // ==========================================================================

  /**
   * Configures the 10 anatomical nodes in local anatomical coordinate space:
   *   headTop, headCenter, neckBase, midThorax, hipPelvis,
   *   knee, ankle, footTip, elbow, wrist
   */
  function buildAnatomicalModel(anthro, bracing, initialAngleDeg) {
    const H = anthro.stature;
    const B = Math.max(0, Math.min(1, Number(bracing) != null ? Number(bracing) : 0.5));
    const pitch = Number(initialAngleDeg) || 0;

    // Contact radii (meters)
    const radii = {
      headTop: 0.09,
      headCenter: 0.10,
      neckBase: 0.08,
      midThorax: 0.12,
      hipPelvis: 0.11,
      knee: 0.07,
      ankle: 0.06,
      footTip: 0.04,
      elbow: 0.05,
      wrist: 0.05
    };

    // Lumped nodal masses (kg)
    const sm = {};
    for (const s of anthro.segmentsList) {
      sm[s.id] = s.mass;
    }
    const nodeMasses = {
      headTop: 0.40 * sm.head,
      headCenter: 0.60 * sm.head + 0.50 * sm.neck,
      neckBase: 0.50 * sm.neck + 0.50 * sm.thorax + 0.50 * sm.upperArm,
      midThorax: 0.50 * sm.thorax + 0.50 * sm.lumbarPelvis,
      hipPelvis: 0.50 * sm.lumbarPelvis + 0.50 * sm.thigh,
      knee: 0.50 * sm.thigh + 0.50 * sm.shank,
      ankle: 0.50 * sm.shank + 0.50 * sm.foot,
      footTip: 0.50 * sm.foot,
      elbow: 0.50 * sm.upperArm + 0.50 * sm.forearmHand,
      wrist: 0.50 * sm.forearmHand
    };

    // Local coordinates along sagittal plane (origin at heel sole)
    const loc = {};
    loc.ankle = { x: 0.0, y: 0.065 * H };
    loc.footTip = { x: 0.13 * H, y: 0.035 * H };
    loc.knee = { x: 0.008 * H, y: loc.ankle.y + 0.246 * H };
    loc.hipPelvis = { x: -0.008 * H, y: loc.knee.y + 0.245 * H };
    loc.midThorax = { x: -0.005 * H, y: loc.hipPelvis.y + 0.145 * H };
    loc.neckBase = { x: 0.0, y: loc.midThorax.y + 0.170 * H };
    loc.headCenter = { x: 0.0, y: loc.neckBase.y + 0.052 * H + 0.065 * H };
    loc.headTop = { x: 0.0, y: loc.neckBase.y + 0.052 * H + 0.130 * H };

    // Upper extremity posture based on neuromuscular bracing & fall pitch
    if (pitch > 15) {
      // Forward fall: active extension of arms (FOOSH posture)
      loc.elbow = { x: 0.18 * H * B + 0.04 * H, y: loc.neckBase.y - 0.05 * H };
      loc.wrist = { x: 0.36 * H * B + 0.06 * H, y: loc.neckBase.y - 0.08 * H };
    } else if (pitch < -15) {
      // Backward fall: arms reach posterior/inferior to break fall
      loc.elbow = { x: -0.10 * H * B - 0.02 * H, y: loc.neckBase.y - 0.12 * H };
      loc.wrist = { x: -0.22 * H * B - 0.03 * H, y: loc.neckBase.y - 0.18 * H };
    } else {
      // Neutral upright posture
      loc.elbow = { x: 0.02 * H, y: loc.neckBase.y - 0.186 * H };
      loc.wrist = { x: 0.03 * H, y: loc.elbow.y - 0.190 * H };
    }

    // Compute Center of Mass (CoM) in local coordinates
    let totM = 0;
    let cx = 0, cy = 0;
    for (const k of Object.keys(nodeMasses)) {
      const m = nodeMasses[k];
      totM += m;
      cx += m * loc[k].x;
      cy += m * loc[k].y;
    }
    cx /= totM;
    cy /= totM;

    return {
      radii,
      nodeMasses,
      loc,
      localCoM: { x: cx, y: cy },
      totalMass: totM
    };
  }

  function dist2(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Computes the Head Injury Criterion (HIC15) using a 15 ms sliding window:
   *   HIC15 = max_{t1, t2; t2-t1 <= 0.015} [ (t2-t1) * ( 1/(t2-t1) \int a(t) dt )^2.5 ]
   */
  function calculateHIC15(headAccG, dt) {
    const n = headAccG.length;
    if (n === 0) return 0;
    const maxSteps = Math.max(1, Math.round(0.015 / dt));

    const prefix = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      prefix[i + 1] = prefix[i] + headAccG[i] * dt;
    }

    let maxHIC = 0;
    for (let i = 0; i < n; i++) {
      const end = Math.min(n, i + maxSteps);
      for (let j = i + 1; j <= end; j++) {
        const dtWin = (j - i) * dt;
        if (dtWin <= 0) continue;
        const avgA = (prefix[j] - prefix[i]) / dtWin;
        const hic = dtWin * Math.pow(Math.max(0, avgA), 2.5);
        if (hic > maxHIC) maxHIC = hic;
      }
    }
    return Number(maxHIC.toFixed(1));
  }

  // ==========================================================================
  // 6. 2000 Hz ARTICULATED MULTI-BODY SOLVER (runSimulation)
  // ==========================================================================
  const defaultParams = {
    height: 3.5,
    angleDeg: 35,
    vx: 1.8,
    vy: 0.0,
    omegaDeg: 95,
    mass: 75,
    stature: 1.75,
    surface: 'concrete',
    stiffness: 5000,
    damping: 45,
    tolerance: 1.00,
    bracing: 0.50
  };

  /**
   * Runs the complete multi-body dynamics simulation:
   *   - Free-fall ballistic trajectory with orientation tracking
   *   - 2000 Hz sub-stepped Hunt-Crossley contact mechanics
   *   - Internal skeletal load transmission & axial conduction
   *   - HIC15 and forensic tolerance failure evaluation
   */
  function runSimulation(params) {
    const p = Object.assign({}, defaultParams, params);

    // Resolve surface stiffness (k) and damping (c)
    let kSurf = Number(p.stiffness) || 5000;
    let cSurf = Number(p.damping) || 45;
    let muSurf = 0.75;
    if (p.surface && SURFACE_PRESETS[p.surface]) {
      const sp = SURFACE_PRESETS[p.surface];
      if (params == null || params.stiffness == null) kSurf = sp.k;
      if (params == null || params.damping == null) cSurf = sp.c;
      muSurf = sp.mu;
    }

    const anthro = computeAnthropometrics(p.mass, p.stature, p.tolerance);
    const model = buildAnatomicalModel(anthro, p.bracing, p.angleDeg);

    const theta0 = (p.angleDeg * Math.PI) / 180.0;
    const cos0 = Math.cos(theta0);
    const sin0 = Math.sin(theta0);
    const omega0 = (p.omegaDeg * Math.PI) / 180.0;

    const nodeKeys = Object.keys(model.loc);
    const relNodes = {};
    let minRelY = Infinity;

    for (const k of nodeKeys) {
      const dx = model.loc[k].x - model.localCoM.x;
      const dy = model.loc[k].y - model.localCoM.y;
      const rx = dx * cos0 - dy * sin0;
      const ry = dx * sin0 + dy * cos0;
      relNodes[k] = { dx, dy, rx, ry };
      const bot = ry - model.radii[k];
      if (bot < minRelY) minRelY = bot;
    }

    // Launch CoM height so lowest node point is at p.height
    const initialCoMY = p.height - minRelY;
    const initialCoMX = 0.0;

    // Flight phase: find ground contact time (tContact)
    const g = 9.81;
    let tContact = 0;
    const dtFlight = 0.001; // 1 ms resolution during flight search
    let inFlight = true;

    while (inFlight && tContact < 12.0) {
      tContact += dtFlight;
      const curCoMY = initialCoMY + p.vy * tContact - 0.5 * g * tContact * tContact;
      const curTheta = theta0 + omega0 * tContact;
      const cT = Math.cos(curTheta);
      const sT = Math.sin(curTheta);

      for (const k of nodeKeys) {
        const rn = relNodes[k];
        const ny = curCoMY + rn.dx * sT + rn.dy * cT;
        if (ny - model.radii[k] <= 0) {
          inFlight = false;
          break;
        }
      }
    }

    const flightTimeS = Number(tContact.toFixed(4));
    const contactCoMY = initialCoMY + p.vy * tContact - 0.5 * g * tContact * tContact;
    const contactCoMX = initialCoMX + p.vx * tContact;
    const contactVy = p.vy - g * tContact;
    const contactVx = p.vx;
    const contactTheta = theta0 + omega0 * tContact;
    const impactVelocityMS = Number(Math.sqrt(contactVx * contactVx + contactVy * contactVy).toFixed(2));

    // Record flight frames at 25 ms intervals so playback is smooth from release to impact
    const frames = [];
    const flightFrameInterval = 0.025;
    let curFlightT = 0;
    while (curFlightT < tContact - 1e-4) {
      const fCoMY = initialCoMY + p.vy * curFlightT - 0.5 * g * curFlightT * curFlightT;
      const fCoMX = initialCoMX + p.vx * curFlightT;
      const fVy = p.vy - g * curFlightT;
      const fVx = p.vx;
      const fTheta = theta0 + omega0 * curFlightT;
      const fcT = Math.cos(fTheta);
      const fsT = Math.sin(fTheta);

      const fNodes = {};
      for (const k of nodeKeys) {
        const rn = relNodes[k];
        fNodes[k] = {
          x: Number((fCoMX + rn.dx * fcT - rn.dy * fsT).toFixed(4)),
          y: Number((fCoMY + rn.dx * fsT + rn.dy * fcT).toFixed(4)),
          vx: Number((fVx - omega0 * (rn.dx * fsT + rn.dy * fcT)).toFixed(2)),
          vy: Number((fVy + omega0 * (rn.dx * fcT - rn.dy * fsT)).toFixed(2))
        };
      }
      const segZeroFI = {};
      for (const def of SEGMENT_DEFINITIONS) segZeroFI[def.id] = 0;

      frames.push({
        t: Number(curFlightT.toFixed(4)),
        nodes: fNodes,
        comX: Number(fCoMX.toFixed(4)),
        comY: Number(fCoMY.toFixed(4)),
        comVx: Number(fVx.toFixed(2)),
        comVy: Number(fVy.toFixed(2)),
        fzTotal: 0,
        fxTotal: 0,
        headG: 1.0,
        segInstantFI: segZeroFI
      });
      curFlightT += flightFrameInterval;
    }

    // Initialize node kinematics at moment of first contact
    const cT = Math.cos(contactTheta);
    const sT = Math.sin(contactTheta);
    const nodes = {};
    for (const k of nodeKeys) {
      const rn = relNodes[k];
      const nx = contactCoMX + rn.dx * cT - rn.dy * sT;
      const ny = contactCoMY + rn.dx * sT + rn.dy * cT;
      const rx = nx - contactCoMX;
      const ry = ny - contactCoMY;
      const nvx = contactVx - omega0 * ry;
      const nvy = contactVy + omega0 * rx;
      nodes[k] = {
        x: nx,
        y: ny,
        vx: nvx,
        vy: nvy,
        prevX: nx,
        prevY: ny,
        m: model.nodeMasses[k],
        r: model.radii[k]
      };
    }

    // Bone links between articulated nodes
    const linkDefs = [
      { seg: 'head', n1: 'headTop', n2: 'headCenter' },
      { seg: 'neck', n1: 'headCenter', n2: 'neckBase' },
      { seg: 'thorax', n1: 'neckBase', n2: 'midThorax' },
      { seg: 'lumbarPelvis', n1: 'midThorax', n2: 'hipPelvis' },
      { seg: 'thigh', n1: 'hipPelvis', n2: 'knee' },
      { seg: 'shank', n1: 'knee', n2: 'ankle' },
      { seg: 'foot', n1: 'ankle', n2: 'footTip' },
      { seg: 'upperArm', n1: 'neckBase', n2: 'elbow' },
      { seg: 'forearmHand', n1: 'elbow', n2: 'wrist' }
    ];

    const links = linkDefs.map(ld => {
      const d = dist2(model.loc[ld.n1], model.loc[ld.n2]);
      return {
        seg: ld.seg,
        n1: ld.n1,
        n2: ld.n2,
        restL: d
      };
    });

    // 2000 Hz Sub-stepped Contact Phase (dt = 0.0005 s, 0.40 seconds duration)
    const dt = 0.0005;
    const contactDuration = 0.40;
    const numSteps = Math.round(contactDuration / dt);

    const peakLoads = {};
    const peakTimes = {};
    const firstContactTime = {};
    const peakContactForces = {};
    for (const def of SEGMENT_DEFINITIONS) {
      peakLoads[def.id] = 0;
      peakTimes[def.id] = 0;
      firstContactTime[def.id] = null;
      peakContactForces[def.id] = 0;
    }

    const timeSeries = [];
    const headAccGList = [];

    let peakGRF = 0;
    let cumDissipatedEnergy = 0;
    const impactFrameInterval = 0.002; // every 2 ms for high-speed replay
    let nextFrameTime = tContact;

    // Calibrated physical contact stiffness multipliers for viscoelastic ground
    const kPhys = kSurf * 75.0; // Effective contact stiffness N/m^1.35
    const cPhys = cSurf * 30.0; // Effective contact damping N*s/m^1.5

    for (let step = 0; step <= numSteps; step++) {
      const curTime = tContact + step * dt;

      // 1. Viscoelastic ground contact forces
      let stepFzTotal = 0;
      let stepFxTotal = 0;
      const contactFn = {};
      const contactFt = {};

      for (const k of nodeKeys) {
        const nd = nodes[k];
        const depth = nd.r - nd.y;
        if (depth > 0) {
          const vNorm = -nd.vy;
          // Non-linear Hunt-Crossley formulation
          let fn = kPhys * Math.pow(depth, 1.35) + cPhys * Math.sqrt(depth) * Math.max(0, vNorm);
          if (fn < 0) fn = 0;
          const maxFt = muSurf * fn;
          const ft = -Math.max(-maxFt, Math.min(maxFt, 1200 * nd.vx));

          contactFn[k] = fn;
          contactFt[k] = ft;
          stepFzTotal += fn;
          stepFxTotal += ft;
        } else {
          contactFn[k] = 0;
          contactFt[k] = 0;
        }
      }

      const currentFzKN = stepFzTotal / 1000;
      if (currentFzKN > peakGRF) {
        peakGRF = currentFzKN;
      }

      // 2. Direct segment contact forces (kN)
      const directContactSeg = {
        head: (contactFn.headTop + contactFn.headCenter) / 1000,
        neck: 0,
        thorax: contactFn.midThorax / 1000,
        lumbarPelvis: contactFn.hipPelvis / 1000,
        thigh: (contactFn.knee * 0.5) / 1000,
        shank: (contactFn.ankle * 0.4 + contactFn.knee * 0.3) / 1000,
        foot: (contactFn.footTip + contactFn.ankle * 0.6) / 1000,
        upperArm: (contactFn.elbow * 0.5) / 1000,
        forearmHand: contactFn.wrist / 1000
      };

      for (const segId of Object.keys(directContactSeg)) {
        const f = directContactSeg[segId];
        if (f > peakContactForces[segId]) {
          peakContactForces[segId] = f;
        }
        if (f > 0.35 && firstContactTime[segId] === null) {
          firstContactTime[segId] = curTime;
        }
      }

      // 3. Dynamic axial wave conduction along skeletal chain
      const footAxial = directContactSeg.foot;
      const shankAxial = footAxial * 0.88 + directContactSeg.shank;
      const thighAxial = shankAxial * 0.80 + directContactSeg.thigh + (directContactSeg.lumbarPelvis > 1.0 ? directContactSeg.lumbarPelvis * 0.55 : 0);

      // Thoracolumbar T12-L1 & Pelvis:
      const bodyDecel = stepFzTotal / model.totalMass;
      const upperBodyMass = model.nodeMasses.headTop + model.nodeMasses.headCenter + model.nodeMasses.neckBase + model.nodeMasses.midThorax;
      const upperInertialLoadKN = (upperBodyMass * bodyDecel) / 1000;
      const lumbarPelvisAxial = Math.max(directContactSeg.lumbarPelvis, thighAxial * 0.68 + upperInertialLoadKN * 0.70);

      const thoraxAxial = Math.max(directContactSeg.thorax, upperInertialLoadKN * 0.40);
      const neckAxial = (model.nodeMasses.headCenter + model.nodeMasses.headTop) * bodyDecel / 1000;
      const headAxial = directContactSeg.head + neckAxial * 0.40;

      const armAxial = directContactSeg.forearmHand * 0.75 + directContactSeg.upperArm;

      const currentSegLoads = {
        head: Number(headAxial.toFixed(2)),
        neck: Number(neckAxial.toFixed(2)),
        thorax: Number(thoraxAxial.toFixed(2)),
        lumbarPelvis: Number(lumbarPelvisAxial.toFixed(2)),
        upperArm: Number(armAxial.toFixed(2)),
        forearmHand: Number(directContactSeg.forearmHand.toFixed(2)),
        thigh: Number(thighAxial.toFixed(2)),
        shank: Number(shankAxial.toFixed(2)),
        foot: Number(footAxial.toFixed(2))
      };

      for (const def of SEGMENT_DEFINITIONS) {
        const l = currentSegLoads[def.id];
        if (l > peakLoads[def.id]) {
          peakLoads[def.id] = l;
          peakTimes[def.id] = curTime;
        }
      }

      // Head resultant acceleration (in g)
      const fHeadNet = Math.sqrt(
        Math.pow(contactFt.headTop + contactFt.headCenter, 2) +
        Math.pow(contactFn.headTop + contactFn.headCenter + neckAxial * 1000 * 0.40, 2)
      );
      const headM = model.nodeMasses.headCenter + model.nodeMasses.headTop;
      const headAccG = fHeadNet / (headM * g);
      headAccGList.push(headAccG);

      // 4. Integrate node positions (Semi-implicit Euler)
      for (const k of nodeKeys) {
        const nd = nodes[k];
        nd.prevX = nd.x;
        nd.prevY = nd.y;

        const ax = contactFt[k] / nd.m;
        const ay = -g + contactFn[k] / nd.m;

        nd.vx += ax * dt;
        nd.vy += ay * dt;

        nd.x += nd.vx * dt;
        nd.y += nd.vy * dt;
      }

      // 5. Position-Based Dynamics (PBD) distance & joint constraint relaxation
      for (let iter = 0; iter < 5; iter++) {
        for (const link of links) {
          const n1 = nodes[link.n1];
          const n2 = nodes[link.n2];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const curD = Math.sqrt(dx * dx + dy * dy);
          if (curD > 1e-6) {
            const diff = (curD - link.restL) / curD;
            const w1 = 1 / n1.m;
            const w2 = 1 / n2.m;
            const wSum = w1 + w2;

            n1.x += dx * (diff * w1 / wSum);
            n1.y += dy * (diff * w1 / wSum);
            n2.x -= dx * (diff * w2 / wSum);
            n2.y -= dy * (diff * w2 / wSum);
          }
        }

        // Knee hyperextension physiological limit
        const thighDx = nodes.hipPelvis.x - nodes.knee.x;
        const thighDy = nodes.hipPelvis.y - nodes.knee.y;
        const shankDx = nodes.ankle.x - nodes.knee.x;
        const shankDy = nodes.ankle.y - nodes.knee.y;
        const kneeCross = thighDx * shankDy - thighDy * shankDx;
        if (kneeCross < 0) {
          nodes.knee.x += 0.001 * (1 + p.bracing);
        }

        // Hard non-tunneling ground limit
        for (const k of nodeKeys) {
          const nd = nodes[k];
          if (nd.y < nd.r * 0.10) {
            nd.y = nd.r * 0.10;
          }
        }
      }

      // Update velocities from corrected positions
      for (const k of nodeKeys) {
        const nd = nodes[k];
        nd.vx = (nd.x - nd.prevX) / dt;
        nd.vy = (nd.y - nd.prevY) / dt;
      }

      // Energy tracking
      let ek = 0, ep = 0;
      let comX = 0, comY = 0, comVx = 0, comVy = 0;
      for (const k of nodeKeys) {
        const nd = nodes[k];
        ek += 0.5 * nd.m * (nd.vx * nd.vx + nd.vy * nd.vy);
        ep += nd.m * g * Math.max(0, nd.y);
        comX += nd.m * nd.x;
        comY += nd.m * nd.y;
        comVx += nd.m * nd.vx;
        comVy += nd.m * nd.vy;
      }
      comX /= model.totalMass;
      comY /= model.totalMass;
      comVx /= model.totalMass;
      comVy /= model.totalMass;

      cumDissipatedEnergy += (stepFzTotal * Math.abs(comVy) + Math.abs(stepFxTotal * comVx)) * dt;

      // Downsample time series for performance
      if (step % 4 === 0) {
        timeSeries.push({
          t: Number(curTime.toFixed(4)),
          fzTotal: Number(currentFzKN.toFixed(2)),
          fxTotal: Number((stepFxTotal / 1000).toFixed(2)),
          headG: Number(headAccG.toFixed(1)),
          ep: Number(ep.toFixed(1)),
          ek: Number(ek.toFixed(1)),
          ediss: Number(cumDissipatedEnergy.toFixed(1)),
          segLoads: { ...currentSegLoads }
        });
      }

      // Store high-resolution frames every 2 ms for smooth timeline scrubbing & video export
      if (curTime >= nextFrameTime - 1e-6) {
        nextFrameTime += impactFrameInterval;
        const snapshotNodes = {};
        for (const k of nodeKeys) {
          snapshotNodes[k] = {
            x: Number(nodes[k].x.toFixed(4)),
            y: Number(nodes[k].y.toFixed(4)),
            vx: Number(nodes[k].vx.toFixed(2)),
            vy: Number(nodes[k].vy.toFixed(2))
          };
        }
        const segInstantFI = {};
        for (const def of SEGMENT_DEFINITIONS) {
          const segTol = anthro.segments[def.id].toleranceKN;
          segInstantFI[def.id] = Number((currentSegLoads[def.id] / segTol).toFixed(2));
        }
        frames.push({
          t: Number(curTime.toFixed(4)),
          nodes: snapshotNodes,
          comX: Number(comX.toFixed(4)),
          comY: Number(comY.toFixed(4)),
          comVx: Number(comVx.toFixed(2)),
          comVy: Number(comVy.toFixed(2)),
          fzTotal: Number(currentFzKN.toFixed(2)),
          fxTotal: Number((stepFxTotal / 1000).toFixed(2)),
          headG: Number(headAccG.toFixed(1)),
          segInstantFI
        });
      }
    }

    // 6. Post-Simulation Assessment & Forensic Diagnosis
    const hic15 = calculateHIC15(headAccGList, dt);
    const peakHeadG = Number(Math.max(...headAccGList).toFixed(1));

    const segmentResults = [];
    let fractureCount = 0;

    for (const def of SEGMENT_DEFINITIONS) {
      const segAnthro = anthro.segments[def.id];
      const peakLoadKN = Number(peakLoads[def.id].toFixed(2));
      const toleranceKN = segAnthro.toleranceKN;
      const fi = Number((peakLoadKN / toleranceKN).toFixed(2));

      // Sigmoid risk curve calibrated to biomechanics AIS PMHS criteria
      const risk = Number((100 / (1 + Math.exp(-6.5 * (fi - 1.0)))).toFixed(1));

      let status = 'safe';
      if (fi >= 1.0) {
        status = 'fracture';
        fractureCount++;
      } else if (fi >= 0.70) {
        status = 'micro';
      }

      // Biomechanical injury mechanism text
      let mechanism = '';
      if (def.id === 'foot') {
        mechanism = peakLoadKN > 1.0 ? 'Direct calcaneal ground impact compression' : 'Sub-threshold contact';
      } else if (def.id === 'shank') {
        mechanism = peakLoadKN > 1.0 ? 'Axial pilon transmission from calcaneus' : 'Sub-threshold axial load';
      } else if (def.id === 'thigh') {
        mechanism = peakLoadKN > 1.0 ? 'Femoral shaft compression & hip joint reaction' : 'Minimal femoral bending';
      } else if (def.id === 'lumbarPelvis') {
        mechanism = peakLoadKN > 2.0 ? 'Axial thoracolumbar crush + upper-body inertial deceleration' : 'T12-L1 physiological compression';
      } else if (def.id === 'thorax') {
        mechanism = peakLoadKN > 1.5 ? 'Torso ground strike & thoracic deceleration' : 'Sub-failure rib compression';
      } else if (def.id === 'neck') {
        mechanism = peakLoadKN > 1.0 ? 'Cervical hyperextension / axial skull base coupling' : 'Physiological cervical tension';
      } else if (def.id === 'head') {
        mechanism = peakLoads.head > 3.0 ? 'Direct cranial vault deceleration spike' : 'Basilar skull axial shock conduction';
      } else if (def.id === 'upperArm') {
        mechanism = peakLoadKN > 1.0 ? 'Humeral compressive transmission / shoulder deceleration' : 'Sub-failure load';
      } else if (def.id === 'forearmHand') {
        mechanism = peakLoadKN > 1.0 ? 'Outstretched hand ground contact (FOOSH mechanism)' : 'Minimal upper extremity load';
      }

      segmentResults.push({
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        peakLoadKN,
        toleranceKN,
        fractureIndex: fi,
        riskPercent: risk,
        status,
        mechanism,
        peakTimeS: Number(peakTimes[def.id].toFixed(4)),
        forensicMorphology: def.forensicMorphology
      });
    }

    // Identify Primary and Secondary Impact Segments
    const contacted = Object.keys(firstContactTime)
      .filter(k => firstContactTime[k] !== null && peakContactForces[k] > 0.3)
      .sort((a, b) => firstContactTime[a] - firstContactTime[b]);

    let primaryImpactSegment = 'None';
    let secondaryImpactSegment = 'None';

    if (contacted.length > 0) {
      const primId = contacted[0];
      const primTime = firstContactTime[primId];
      primaryImpactSegment = anthro.segments[primId] ? anthro.segments[primId].name : primId;

      const anatomicalGroups = {
        head: 'cranial',
        neck: 'cranial',
        thorax: 'torso',
        lumbarPelvis: 'pelvis',
        upperArm: 'upperExt',
        forearmHand: 'upperExt',
        thigh: 'lowerExt',
        shank: 'lowerExt',
        foot: 'lowerExt'
      };
      const primGroup = anatomicalGroups[primId] || 'other';

      let secId = null;
      let maxSecForce = 0;
      for (const k of contacted) {
        if (k === primId) continue;
        const g = anatomicalGroups[k] || 'other';
        const dtImpact = firstContactTime[k] - primTime;
        if (g !== primGroup && dtImpact >= 0.015) {
          if (peakContactForces[k] > maxSecForce) {
            maxSecForce = peakContactForces[k];
            secId = k;
          }
        }
      }
      if (secId && anthro.segments[secId]) {
        secondaryImpactSegment = anthro.segments[secId].name;
      }
    }

    // Fall Injury Regime Classification
    let injuryRegime = 'regime-local';
    if (p.height > 10.0) {
      injuryRegime = 'regime-systemic';
    } else if (p.height > 3.0) {
      injuryRegime = 'regime-axial';
    }

    // Hat Brim Line (HBL) Assessment
    let hatBrimLineAssessment = '';
    const headFI = segmentResults.find(s => s.id === 'head').fractureIndex;

    if (headFI < 0.70) {
      hatBrimLineAssessment = 'Axial Sparing: No primary cranial vault impact detected. Cranium spared from direct flat-surface deceleration; skull base subjected only to attenuated axial transmission.';
    } else if (p.height <= 2.0) {
      hatBrimLineAssessment = 'Classic Low Fall (< 2.0 m): Direct cranial impact strictly localized at or below the Hat Brim Line (occipital / temporal rim). Consistent with accidental slip/trip fall onto flat ground; strongly discriminates against elevated blunt-force weapon strikes above HBL.';
    } else if (p.height <= 5.0) {
      hatBrimLineAssessment = 'Intermediate Fall (2.0–5.0 m): Calvarial impact at Hat Brim Line with superiorly radiating fissure lines. Fracture morphology consistent with ground deceleration rather than focused weapon impact.';
    } else {
      hatBrimLineAssessment = 'High-Velocity Fall (> 5.0 m): Severe calvarial bursting and comminuted fractures traversing both below and above the Hat Brim Line due to high-energy planar ground impact and secondary rebound.';
    }

    // Overall Mortality Risk
    let mortRisk = 0;
    if (hic15 > 1500 || peakHeadG > 180) mortRisk += 65;
    else if (hic15 > 1000 || peakHeadG > 120) mortRisk += 35;
    else if (hic15 > 500) mortRisk += 15;

    mortRisk += fractureCount * 8;
    if (p.height > 15) mortRisk += 30;
    else if (p.height > 9) mortRisk += 15;
    const overallMortalityRisk = Number(Math.min(100, Math.max(0, mortRisk)).toFixed(1));

    const summary = {
      impactVelocityMS,
      flightTimeS,
      peakGRF_KN: Number(peakGRF.toFixed(2)),
      hic15,
      peakHeadG,
      primaryImpactSegment,
      secondaryImpactSegment,
      injuryRegime,
      hatBrimLineAssessment,
      fractureCount,
      overallMortalityRisk
    };

    return {
      params: p,
      anthropometrics: anthro,
      frames,
      timeSeries,
      segmentResults,
      summary
    };
  }

  // ==========================================================================
  // 7. PARAMETRIC MULTI-HEIGHT SWEEP (runHeightSweep)
  // ==========================================================================
  /**
   * Automatically executes 30 simulations from h = 1 m to 30 m using base kinematic
   * and surface parameters, capturing the bimodal cranial trauma distribution.
   */
  function runHeightSweep(baseParams) {
    const sweepResults = [];
    const base = Object.assign({}, defaultParams, baseParams);

    for (let h = 1; h <= 30; h++) {
      const sweepParam = Object.assign({}, base, { height: h });
      const sim = runSimulation(sweepParam);
      const segs = sim.segmentResults;
      const headSeg = segs.find(s => s.id === 'head') || { riskPercent: 0 };
      const footSeg = segs.find(s => s.id === 'foot') || { riskPercent: 0 };
      const shankSeg = segs.find(s => s.id === 'shank') || { riskPercent: 0 };
      const thighSeg = segs.find(s => s.id === 'thigh') || { riskPercent: 0 };
      const lumbarSeg = segs.find(s => s.id === 'lumbarPelvis') || { riskPercent: 0 };

      const lowerExtRisk = Math.max(footSeg.riskPercent, shankSeg.riskPercent, thighSeg.riskPercent);
      const spinePelvisRisk = lumbarSeg.riskPercent;
      const headRisk = headSeg.riskPercent;

      let primaryRegion = 'Lower Extremity';
      const pName = sim.summary.primaryImpactSegment;
      if (pName.includes('Cranium')) primaryRegion = 'Cranium / Head';
      else if (pName.includes('Pelvis') || pName.includes('Spine')) primaryRegion = 'Spine & Pelvis';
      else if (pName.includes('Thorax') || pName.includes('Arm') || pName.includes('Wrist') || pName.includes('Radius')) primaryRegion = 'Upper Torso / Limb';

      // Normalized impact angle in [-180, 180]
      let impactAngleDeg = ((base.angleDeg || 0) + (base.omegaDeg || 0) * sim.summary.flightTimeS) % 360;
      if (impactAngleDeg > 180) impactAngleDeg -= 360;
      if (impactAngleDeg < -180) impactAngleDeg += 360;

      sweepResults.push({
        height: h,
        impactAngleDeg: Number(impactAngleDeg.toFixed(1)),
        primaryRegion,
        headRisk,
        lowerExtRisk,
        spinePelvisRisk,
        peakGRF: sim.summary.peakGRF_KN
      });
    }

    return sweepResults;
  }

  // ==========================================================================
  // 8. PUBLIC API EXPORTS
  // ==========================================================================
  return {
    SURFACE_PRESETS,
    TOLERANCE_PROFILES,
    SCENARIO_PRESETS,
    SEGMENT_DEFINITIONS,
    defaultParams,
    computeAnthropometrics,
    calculateHIC15,
    runSimulation,
    runHeightSweep,
    getSegmentDefinitions: function () {
      return SEGMENT_DEFINITIONS.slice();
    }
  };
});
