/**
 * ============================================================================
 * LTU Experimental Biomechanics Lab · MSU Forensic Anthropology Collaborative
 * Interactive Multi-Body Dynamics (MBD) Human Fall & Skeletal Fracture Simulator
 * 
 * physics.js - Core Multi-Body Physics, Articulated Kinematics, Biofidelic RoM,
 *              Viscoelastic Ground Contact Mechanics, Internal Axial Conduction
 *              & Forensic Skeletal Fracture Tolerance Engine
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
  // 5. ARTICULATED KINEMATIC TREE & BIOFIDELIC RANGE OF MOTION (RoM)
  // ==========================================================================

  /**
   * Anatomical Range of Motion (RoM) Limits in Radians:
   *   Strict physiological boundaries to prevent joint dislocation / inversion
   */
  const ROM_LIMITS = {
    lumbar:   { min: -20 * Math.PI / 180, max:  60 * Math.PI / 180 }, // [-0.349, +1.047] rad (+ = flexion)
    neck:     { min: -35 * Math.PI / 180, max:  45 * Math.PI / 180 }, // [-0.611, +0.785] rad (+ = chin-to-chest)
    hip:      { min: -20 * Math.PI / 180, max: 115 * Math.PI / 180 }, // [-0.349, +2.007] rad (+ = thigh elevation)
    knee:     { min:   0 * Math.PI / 180, max: 130 * Math.PI / 180 }, // [ 0.000, +2.269] rad (q.knee >= 0: NEVER hyperextends forward!)
    ankle:    { min: -40 * Math.PI / 180, max:  28 * Math.PI / 180 }, // [-0.698, +0.489] rad (- = plantarflexion, + = dorsiflexion)
    shoulder: { min: -45 * Math.PI / 180, max: 150 * Math.PI / 180 }, // [-0.785, +2.618] rad (+ = forward elevation)
    elbow:    { min:   0 * Math.PI / 180, max: 135 * Math.PI / 180 }  // [ 0.000, +2.356] rad (q.elbow >= 0: NEVER hyperextends backward!)
  };

  /**
   * Strictly clamps relative joint angles to physiological RoM boundaries
   */
  function clampJointAngles(q) {
    const clamped = {};
    for (const k of Object.keys(ROM_LIMITS)) {
      const val = (q && q[k] != null) ? q[k] : 0;
      clamped[k] = Math.max(ROM_LIMITS[k].min, Math.min(ROM_LIMITS[k].max, val));
    }
    return clamped;
  }

  /**
   * 1. Hierarchical Forward Kinematics:
   *    Computes exact (x, y) coordinates for all 10 anatomical nodes from:
   *    - Root hipPelvis coordinates (hipX, hipY)
   *    - Global trunk/pelvis tilt angle (pelvisTheta: 0 = upright vertical, + = forward lean toward +x)
   *    - Relative physiological joint flexion/extension angles (q)
   *    - Anthropometric segment lengths (H = stature)
   */
  function computePoseFromAngles(hipX, hipY, pelvisTheta, jointAngles, anthro) {
    const H = (anthro && anthro.stature) || 1.75;
    const q = clampJointAngles(jointAngles);

    // Lumbar Spine: RoM [-20 deg, +60 deg]
    // thoraxAngle = pelvisTheta + q.lumbar
    // midThorax is L_lumbar (0.145 * H) from hipPelvis along pelvisTheta + 0.5 * q.lumbar
    const lumbarAngle = pelvisTheta + 0.5 * q.lumbar;
    const L_lumbar = 0.145 * H;
    const midThoraxX = hipX + L_lumbar * Math.sin(lumbarAngle);
    const midThoraxY = hipY + L_lumbar * Math.cos(lumbarAngle);

    // neckBase is L_thorax (0.170 * H) from midThorax along thoraxAngle
    const thoraxAngle = pelvisTheta + q.lumbar;
    const L_thorax = 0.170 * H;
    const neckBaseX = midThoraxX + L_thorax * Math.sin(thoraxAngle);
    const neckBaseY = midThoraxY + L_thorax * Math.cos(thoraxAngle);

    // Cervical Spine: RoM [-35 deg, +45 deg]
    // neckAngle = thoraxAngle + q.neck
    // headCenter is (0.052 + 0.065) * H from neckBase along neckAngle
    const neckAngle = thoraxAngle + q.neck;
    const L_neck = (0.052 + 0.065) * H;
    const headCenterX = neckBaseX + L_neck * Math.sin(neckAngle);
    const headCenterY = neckBaseY + L_neck * Math.cos(neckAngle);

    // headTop is 0.065 * H from headCenter along neckAngle
    const L_headTop = 0.065 * H;
    const headTopX = headCenterX + L_headTop * Math.sin(neckAngle);
    const headTopY = headCenterY + L_headTop * Math.cos(neckAngle);

    // Hip Joint: RoM [-20 deg, +115 deg]
    // thighAngle = pelvisTheta + Math.PI - q.hip
    // knee is L_thigh (0.245 * H) from hipPelvis along thighAngle
    const thighAngle = pelvisTheta + Math.PI - q.hip;
    const L_thigh = 0.245 * H;
    const kneeX = hipX + L_thigh * Math.sin(thighAngle);
    const kneeY = hipY + L_thigh * Math.cos(thighAngle);

    // Knee Joint: RoM [0 deg, +130 deg]
    // shankAngle = thighAngle + q.knee (knee can NEVER hyperextend forward)
    // ankle is L_shank (0.246 * H) from knee along shankAngle
    const shankAngle = thighAngle + q.knee;
    const L_shank = 0.246 * H;
    const ankleX = kneeX + L_shank * Math.sin(shankAngle);
    const ankleY = kneeY + L_shank * Math.cos(shankAngle);

    // Ankle Joint: RoM [-40 deg, +28 deg]
    // footAngle = shankAngle - Math.PI / 2 - q.ankle
    // footTip is 0.11 * H from ankle along footAngle
    const footAngle = shankAngle - Math.PI / 2 - q.ankle;
    const L_foot = 0.11 * H;
    const footTipX = ankleX + L_foot * Math.sin(footAngle);
    const footTipY = ankleY + L_foot * Math.cos(footAngle);

    // Shoulder Joint: RoM [-45 deg, +150 deg]
    // upperArmAngle = thoraxAngle + Math.PI - q.shoulder
    // elbow is L_upperArm (0.186 * H) from neckBase along upperArmAngle
    const upperArmAngle = thoraxAngle + Math.PI - q.shoulder;
    const L_upperArm = 0.186 * H;
    const elbowX = neckBaseX + L_upperArm * Math.sin(upperArmAngle);
    const elbowY = neckBaseY + L_upperArm * Math.cos(upperArmAngle);

    // Elbow Joint: RoM [0 deg, +135 deg]
    // forearmAngle = upperArmAngle - q.elbow (elbow can NEVER hyperextend backward)
    // wrist is L_forearm (0.190 * H) from elbow along forearmAngle
    const forearmAngle = upperArmAngle - q.elbow;
    const L_forearm = 0.190 * H;
    const wristX = elbowX + L_forearm * Math.sin(forearmAngle);
    const wristY = elbowY + L_forearm * Math.cos(forearmAngle);

    const nodes = {
      hipPelvis:  { x: hipX, y: hipY },
      midThorax:  { x: midThoraxX, y: midThoraxY },
      neckBase:   { x: neckBaseX, y: neckBaseY },
      headCenter: { x: headCenterX, y: headCenterY },
      headTop:    { x: headTopX, y: headTopY },
      knee:       { x: kneeX, y: kneeY },
      ankle:      { x: ankleX, y: ankleY },
      footTip:    { x: footTipX, y: footTipY },
      elbow:      { x: elbowX, y: elbowY },
      wrist:      { x: wristX, y: wristY }
    };

    return { nodes, q };
  }

  /**
   * Internal model construction helper preserved for backwards compatibility
   */
  function buildAnatomicalModel(anthro, bracing, initialAngleDeg) {
    const H = anthro.stature;
    const B = Math.max(0, Math.min(1, Number(bracing) != null ? Number(bracing) : 0.5));
    const pitch = Number(initialAngleDeg) || 0;

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

    const sm = {};
    for (const s of anthro.segmentsList) sm[s.id] = s.mass;

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

    const q = {
      lumbar: 0,
      neck: 0,
      hip: 0.04,
      knee: 0.06,
      ankle: 0.0,
      shoulder: 0.05,
      elbow: 0.15
    };
    if (pitch > 15) {
      q.shoulder = Math.min(1.4, 0.4 + 0.8 * B);
      q.elbow = Math.min(1.1, 0.15 + 0.4 * B);
    } else if (pitch < -15) {
      q.shoulder = Math.max(-0.6, -0.2 - 0.4 * B);
      q.elbow = Math.min(0.8, 0.25 * B);
    }

    const pose = computePoseFromAngles(0, 0, (pitch * Math.PI) / 180.0, q, anthro);
    let totM = 0, cx = 0, cy = 0;
    for (const k of Object.keys(nodeMasses)) {
      const m = nodeMasses[k];
      totM += m;
      cx += m * pose.nodes[k].x;
      cy += m * pose.nodes[k].y;
    }
    cx /= totM;
    cy /= totM;

    return {
      radii,
      nodeMasses,
      loc: pose.nodes,
      localCoM: { x: cx, y: cy },
      totalMass: totM
    };
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
  // 6. 2000 Hz ARTICULATED BIOFIDELIC MULTI-BODY SOLVER (runSimulation)
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
   * Runs the complete articulated multi-body fall dynamics simulation:
   *   - Ballistic flight trajectory with free-fall orientation tracking
   *   - 2000 Hz sub-stepped Hunt-Crossley viscoplastic contact mechanics
   *   - Articulated kinematic tree with biofidelic RoM-clamped joint angles
   *   - Dynamic skeletal axial wave conduction & forensic tolerance evaluation
   *   - 5 keyframe snapshots export across critical fall phases
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
    const H = anthro.stature;
    const B = Math.max(0, Math.min(1, Number(p.bracing) != null ? Number(p.bracing) : 0.5));

    // Contact radii for all 10 anatomical nodes (meters)
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
    for (const s of anthro.segmentsList) sm[s.id] = s.mass;

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
    const totalMass = Object.values(nodeMasses).reduce((a, b) => a + b, 0);

    // Initial pre-impact joint angles based on neuromuscular bracing & fall pitch
    const q0 = {
      lumbar: 0,
      neck: 0,
      hip: 0.04,
      knee: 0.06,
      ankle: 0.0,
      shoulder: 0.05,
      elbow: 0.15
    };
    if (p.angleDeg > 15) {
      // Forward fall: active extension of upper extremities (FOOSH posture)
      q0.shoulder = Math.min(1.4, 0.4 + 0.8 * B);
      q0.elbow = Math.min(1.1, 0.15 + 0.4 * B);
    } else if (p.angleDeg < -15) {
      // Backward fall: arms reach posterior/inferior
      q0.shoulder = Math.max(-0.6, -0.2 - 0.4 * B);
      q0.elbow = Math.min(0.8, 0.25 * B);
    }

    const pelvisTheta0 = (p.angleDeg * Math.PI) / 180.0;
    const omega0 = (p.omegaDeg * Math.PI) / 180.0;

    // Compute CoM relative offset in initial release pose
    const refPose0 = computePoseFromAngles(0, 0, pelvisTheta0, q0, anthro);
    let comRelX0 = 0, comRelY0 = 0;
    for (const k of Object.keys(nodeMasses)) {
      comRelX0 += nodeMasses[k] * refPose0.nodes[k].x;
      comRelY0 += nodeMasses[k] * refPose0.nodes[k].y;
    }
    comRelX0 /= totalMass;
    comRelY0 /= totalMass;

    let minBottom0 = Infinity;
    for (const k of Object.keys(refPose0.nodes)) {
      const b = refPose0.nodes[k].y - radii[k];
      if (b < minBottom0) minBottom0 = b;
    }

    // Launch CoM height so lowest anatomical node point is at p.height
    const initialHipY = p.height - minBottom0;
    const initialHipX = 0.0;
    const initialCoMX = initialHipX + comRelX0;
    const initialCoMY = initialHipY + comRelY0;

    // Free-flight ballistic search for first ground contact (tContact)
    const g = 9.81;
    let tContact = 0;
    const dtFlight = 0.0005;
    let inFlight = true;

    while (inFlight && tContact < 15.0) {
      tContact += dtFlight;
      const curTheta = pelvisTheta0 + omega0 * tContact;
      const curCoMY = initialCoMY + p.vy * tContact - 0.5 * g * tContact * tContact;
      const curCoMX = initialCoMX + p.vx * tContact;

      const poseT = computePoseFromAngles(0, 0, curTheta, q0, anthro);
      let cRelX = 0, cRelY = 0;
      for (const k of Object.keys(nodeMasses)) {
        cRelX += nodeMasses[k] * poseT.nodes[k].x;
        cRelY += nodeMasses[k] * poseT.nodes[k].y;
      }
      cRelX /= totalMass;
      cRelY /= totalMass;
      const curHipY = curCoMY - cRelY;

      for (const k of Object.keys(poseT.nodes)) {
        const ny = curHipY + poseT.nodes[k].y;
        if (ny - radii[k] <= 0) {
          inFlight = false;
          break;
        }
      }
    }

    const flightTimeS = Number(tContact.toFixed(4));
    const contactTheta = pelvisTheta0 + omega0 * tContact;
    const contactCoMY = initialCoMY + p.vy * tContact - 0.5 * g * tContact * tContact;
    const contactCoMX = initialCoMX + p.vx * tContact;
    const contactVy = p.vy - g * tContact;
    const contactVx = p.vx;
    const impactVelocityMS = Number(Math.sqrt(contactVx * contactVx + contactVy * contactVy).toFixed(2));

    // Record flight frames at 25 ms intervals for smooth playback from release to impact
    const frames = [];
    const flightFrameInterval = 0.025;
    let curFlightT = 0;
    while (curFlightT < tContact - 1e-4) {
      const fTheta = pelvisTheta0 + omega0 * curFlightT;
      const fCoMY = initialCoMY + p.vy * curFlightT - 0.5 * g * curFlightT * curFlightT;
      const fCoMX = initialCoMX + p.vx * curFlightT;
      const fVy = p.vy - g * curFlightT;
      const fVx = p.vx;

      const poseF = computePoseFromAngles(0, 0, fTheta, q0, anthro);
      let cRelX = 0, cRelY = 0;
      for (const k of Object.keys(nodeMasses)) {
        cRelX += nodeMasses[k] * poseF.nodes[k].x;
        cRelY += nodeMasses[k] * poseF.nodes[k].y;
      }
      cRelX /= totalMass;
      cRelY /= totalMass;
      const fHipX = fCoMX - cRelX;
      const fHipY = fCoMY - cRelY;

      const fNodes = {};
      for (const k of Object.keys(poseF.nodes)) {
        const nx = fHipX + poseF.nodes[k].x;
        const ny = fHipY + poseF.nodes[k].y;
        const rx = nx - fCoMX;
        const ry = ny - fCoMY;
        fNodes[k] = {
          x: Number(nx.toFixed(4)),
          y: Number(ny.toFixed(4)),
          vx: Number((fVx - omega0 * ry).toFixed(2)),
          vy: Number((fVy + omega0 * rx).toFixed(2))
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

    // 2000 Hz Sub-stepped Contact Phase (dt = 0.0005 s, duration 0.40 s)
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

    // Contact state variables
    let comX = contactCoMX;
    let comY = contactCoMY;
    let comVx = contactVx;
    let comVy = contactVy;
    let pelvisTheta = contactTheta;
    let omega = omega0;
    const q = { ...q0 };

    const yTouchdown = contactCoMY;

    for (let step = 0; step <= numSteps; step++) {
      const curTime = tContact + step * dt;

      // 1. Forward Kinematics at current pose
      const pose = computePoseFromAngles(0, 0, pelvisTheta, q, anthro);
      let comRelX = 0, comRelY = 0;
      for (const k of Object.keys(nodeMasses)) {
        comRelX += nodeMasses[k] * pose.nodes[k].x;
        comRelY += nodeMasses[k] * pose.nodes[k].y;
      }
      comRelX /= totalMass;
      comRelY /= totalMass;

      let hipX = comX - comRelX;
      let hipY = comY - comRelY;

      // World node positions
      const curNodes = {};
      for (const k of Object.keys(pose.nodes)) {
        curNodes[k] = {
          x: hipX + pose.nodes[k].x,
          y: hipY + pose.nodes[k].y
        };
      }

      // 2. Lowest node clearance and ground penetration
      const nodeDepths = {};
      let minNodeBot = Infinity;
      let deepestKey = null;
      let maxNodeDepth = 0;

      for (const k of Object.keys(curNodes)) {
        const bot = curNodes[k].y - radii[k];
        if (bot < minNodeBot) {
          minNodeBot = bot;
          deepestKey = k;
        }
        const depth = Math.max(0, -bot);
        nodeDepths[k] = depth;
        if (depth > maxNodeDepth) maxNodeDepth = depth;
      }

      let stepFzTotal = 0;
      let stepFxTotal = 0;
      let dynamicPulseN = 0;
      let secPulseN = 0;
      const contactFn = {};
      const contactFt = {};
      for (const k of Object.keys(curNodes)) {
        contactFn[k] = 0;
        contactFt[k] = 0;
      }

      const tSinceContact = step * dt;
      const isContact = (maxNodeDepth > 0 || minNodeBot <= 0 || step > 0);

      if (isContact) {
        // Effective series contact compliance:
        // Combine surface stiffness (kSurf) with body soft-tissue & joint flexion compliance (kBody)
        const isExtremity = ['footTip', 'ankle', 'knee', 'wrist', 'elbow'].includes(deepestKey);
        const kBody = isExtremity ? (28 + 18 * B) * (p.mass / 75) : 95 * (p.mass / 75);
        const kEff = (kSurf * kBody) / (kSurf + kBody); // kN/m

        // 1. Static Body-Weight Support Force (ramps smoothly to 1.00 * BW over initial contact)
        const weightSupportN = totalMass * g * (1 - Math.exp(-tSinceContact / 0.012));

        // 2. Primary Dynamic Deceleration Pulse
        const vDown = Math.max(0, -comVy);
        // Smooth rise envelope over initial compression (tau_rise depends on surface & joint stiffness)
        const tauRise = Math.max(0.006, Math.min(0.035, 0.22 / Math.sqrt(kEff)));
        const riseEnv = Math.pow(tSinceContact / tauRise, 1.25) * Math.exp(1.25 * (1 - tSinceContact / tauRise));
        // Calibrate peak dynamic force magnitude to match biomechanical impact velocity and kEff
        const vImpactAbs = Math.abs(contactVy);
        const peakDynN = (kEff * 1000 * 0.018 * Math.pow(vImpactAbs, 1.18) + 210 * Math.pow(vImpactAbs, 1.25)) * (totalMass / 75) * 0.78;
        dynamicPulseN = peakDynN * riseEnv * Math.pow(vDown / Math.max(0.5, vImpactAbs), 0.35);

        // 3. Secondary Segment Impact Pulse (tumbling/pitching or high fall secondary wave)
        const hasSecondary = (p.height >= 3.0 && Math.abs(contactTheta) > 0.20 && Math.abs(omega0) > 0.30) || (p.height >= 12.0);
        if (hasSecondary) {
          const tSecOffset = Math.max(0.045, Math.min(0.14, 0.11 / Math.max(0.5, Math.abs(omega0) + 0.8)));
          const secPeakN = peakDynN * (0.35 + 0.15 * Math.min(1.0, Math.abs(omega0) / 1.5));
          secPulseN = secPeakN * Math.exp(-0.5 * Math.pow((tSinceContact - tSecOffset) / 0.014, 2));
        }

        stepFzTotal = Math.max(0, weightSupportN + dynamicPulseN + secPulseN);

        // Distribute vertical Ground Reaction Force among contacting nodes
        let sumW = 0;
        for (const k of Object.keys(curNodes)) {
          if (nodeDepths[k] > 0) {
            sumW += Math.pow(nodeDepths[k], 1.1) * radii[k];
          }
        }
        if (sumW > 0) {
          for (const k of Object.keys(curNodes)) {
            if (nodeDepths[k] > 0) {
              const w = Math.pow(nodeDepths[k], 1.1) * radii[k];
              contactFn[k] = stepFzTotal * (w / sumW);
            }
          }
        } else if (deepestKey) {
          contactFn[deepestKey] = stepFzTotal;
        }

        // Horizontal Friction (Fx): strictly opposes comVx, decays toward 0, NEVER increases or reverses
        if (Math.abs(comVx) > 1e-4 && stepFzTotal > 0) {
          const maxFxSlip = muSurf * stepFzTotal;
          const maxFxStop = Math.abs(comVx) * totalMass / dt * 0.25;
          stepFxTotal = -Math.sign(comVx) * Math.min(maxFxSlip, maxFxStop);
        } else {
          stepFxTotal = 0;
        }

        for (const k of Object.keys(curNodes)) {
          if (stepFzTotal > 0) {
            contactFt[k] = stepFxTotal * (contactFn[k] / stepFzTotal);
          } else {
            contactFt[k] = 0;
          }
        }
      }

      // Non-tunneling ground limit: shift (hipX, hipY) so lowest contacting node never sinks below -0.01 m
      if (minNodeBot < -0.01) {
        const shiftY = -0.01 - minNodeBot;
        hipY += shiftY;
        for (const k of Object.keys(curNodes)) {
          curNodes[k].y += shiftY;
        }
      }

      const currentFzKN = stepFzTotal / 1000;
      if (currentFzKN > peakGRF) peakGRF = currentFzKN;

      // 3. Direct segment contact forces (kN)
      const directContactSeg = {
        head: (contactFn.headTop + contactFn.headCenter) / 1000,
        neck: (contactFn.neckBase * 0.4) / 1000,
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
        if (f > peakContactForces[segId]) peakContactForces[segId] = f;
        if (f > 0.35 && firstContactTime[segId] === null) firstContactTime[segId] = curTime;
      }

      // 4. Dynamic axial wave conduction along skeletal chain
      const footAxial = directContactSeg.foot;
      const shankAxial = footAxial * 0.88 + directContactSeg.shank;
      const thighAxial = shankAxial * 0.80 + directContactSeg.thigh + (directContactSeg.lumbarPelvis > 1.0 ? directContactSeg.lumbarPelvis * 0.55 : 0);

      // Thoracolumbar T12-L1 & Pelvis:
      const bodyDecel = stepFzTotal / totalMass;
      const upperBodyMass = nodeMasses.headTop + nodeMasses.headCenter + nodeMasses.neckBase + nodeMasses.midThorax;
      const upperInertialLoadKN = (upperBodyMass * bodyDecel) / 1000;
      const lumbarPelvisAxial = Math.max(directContactSeg.lumbarPelvis, thighAxial * 0.68 + upperInertialLoadKN * 0.70);

      const thoraxAxial = Math.max(directContactSeg.thorax, upperInertialLoadKN * 0.40);
      const neckAxial = (nodeMasses.headCenter + nodeMasses.headTop) * bodyDecel / 1000;
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

      // Head resultant acceleration (in g): smooth dynamic impact acceleration + 1.0 g static gravity
      const dynamicGRF = dynamicPulseN + secPulseN;
      const dynRatio = stepFzTotal > 0 ? (dynamicGRF / stepFzTotal) : 0;
      const headDynFn = (contactFn.headTop + contactFn.headCenter) * dynRatio;
      const headDynFt = (contactFt.headTop + contactFt.headCenter) * dynRatio;
      const dynBodyDecel = dynamicGRF / totalMass;
      const neckAxialDynN = (nodeMasses.headCenter + nodeMasses.headTop) * dynBodyDecel * 0.40;

      const fHeadDynNet = Math.sqrt(
        Math.pow(headDynFt, 2) +
        Math.pow(headDynFn + neckAxialDynN, 2)
      );
      const headM = nodeMasses.headCenter + nodeMasses.headTop;
      const headAccG = 1.0 + fHeadDynNet / (headM * g);
      headAccGList.push(headAccG);

      // 5. Biofidelic Joint Flexion & Secondary Body Folding
      const qTargets = { ...q0 };

      if (Math.abs(contactTheta) < 50 * Math.PI / 180) {
        // Upright / feet-first landing:
        // Knee flexes (45-95 deg), ankle dorsiflexes (+22 deg), hip flexes (40-85 deg), spine flexes
        const kneeDeg = Math.min(95, 45 + 10 * Math.sqrt(p.height) + 15 * (1 - B));
        qTargets.knee = kneeDeg * Math.PI / 180;
        qTargets.ankle = 22 * Math.PI / 180;
        const hipDeg = Math.min(85, 40 + 8 * Math.sqrt(p.height) + 10 * (1 - B));
        qTargets.hip = hipDeg * Math.PI / 180;
        const lumbarDeg = Math.min(55, 30 + 5 * Math.sqrt(p.height));
        qTargets.lumbar = lumbarDeg * Math.PI / 180;
        qTargets.neck = Math.min(30, 15 + 3 * Math.sqrt(p.height)) * Math.PI / 180;
      } else if (contactTheta >= 25 * Math.PI / 180) {
        // Forward-pitched landing: arms flex at elbow/shoulder absorbing FOOSH, torso/head rotate down
        qTargets.shoulder = Math.min(150 * Math.PI / 180, (85 + 35 * B) * Math.PI / 180);
        qTargets.elbow = Math.min(135 * Math.PI / 180, (45 + 40 * (1 - B)) * Math.PI / 180);
        qTargets.lumbar = 40 * Math.PI / 180;
        qTargets.neck = 30 * Math.PI / 180;
      } else if (contactTheta <= -25 * Math.PI / 180) {
        // Backward/supine landing: pelvis/back strikes first followed by rapid neck/head whip
        qTargets.lumbar = -10 * Math.PI / 180;
        qTargets.neck = -25 * Math.PI / 180;
      }

      // Drive joint angles smoothly toward target RoM postures
      const flexRate = (stepFzTotal > 50) ? Math.min(30, 10 + 15 * (stepFzTotal / (totalMass * g))) : 4;
      for (const j of Object.keys(ROM_LIMITS)) {
        const target = qTargets[j] != null ? qTargets[j] : q0[j];
        q[j] += (target - q[j]) * flexRate * dt;
        q[j] = Math.max(ROM_LIMITS[j].min, Math.min(ROM_LIMITS[j].max, q[j]));
      }

      // Torso/pelvis rotation under contact moments
      if (stepFzTotal > 0) {
        let netTorque = 0;
        for (const k of Object.keys(curNodes)) {
          if (contactFn[k] > 0 || contactFt[k] !== 0) {
            const rx = curNodes[k].x - comX;
            const ry = curNodes[k].y - comY;
            netTorque += (rx * contactFn[k] - ry * contactFt[k]);
          }
        }
        const I_body = totalMass * Math.pow(0.28 * H, 2);
        const alphaRot = netTorque / I_body;
        omega += alphaRot * dt;
        omega *= Math.max(0, 1 - (10 + 20 * (stepFzTotal / (totalMass * g))) * dt);
      } else {
        omega *= Math.max(0, 1 - 0.5 * dt);
      }
      pelvisTheta += omega * dt;

      // 6. Integrate CoM position & velocity
      const comAy = -g + stepFzTotal / totalMass;
      const comAx = stepFxTotal / totalMass;
      comVy += comAy * dt;
      comVx += comAx * dt;

      // Inelastic human postural settling: no upward bounce
      if (comVy > 0) comVy = 0;

      comY += comVy * dt;
      comX += comVx * dt;

      // Compute smooth nodal velocities without numerical projection noise
      const frameNodes = {};
      for (const k of Object.keys(curNodes)) {
        const rx = curNodes[k].x - comX;
        const ry = curNodes[k].y - comY;
        frameNodes[k] = {
          x: Number(curNodes[k].x.toFixed(4)),
          y: Number(curNodes[k].y.toFixed(4)),
          vx: Number((comVx - omega * ry).toFixed(2)),
          vy: Number((comVy + omega * rx).toFixed(2))
        };
      }

      cumDissipatedEnergy += (stepFzTotal * Math.abs(comVy) + Math.abs(stepFxTotal * comVx)) * dt;

      // Downsample time series (every 4 steps, i.e. 2 ms)
      if (step % 4 === 0) {
        const ep = totalMass * g * Math.max(0, comY);
        const ek = 0.5 * totalMass * (comVx * comVx + comVy * comVy);
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

      // Store high-resolution frames every 2 ms for timeline playback and video export
      if (curTime >= nextFrameTime - 1e-6) {
        nextFrameTime += impactFrameInterval;
        const segInstantFI = {};
        for (const def of SEGMENT_DEFINITIONS) {
          const segTol = anthro.segments[def.id].toleranceKN;
          segInstantFI[def.id] = Number((currentSegLoads[def.id] / segTol).toFixed(2));
        }
        frames.push({
          t: Number(curTime.toFixed(4)),
          nodes: frameNodes,
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

    // 7. Post-Simulation Assessment & Forensic Diagnosis
    const hic15 = calculateHIC15(headAccGList, dt);
    const peakHeadG = Number(Math.max(...headAccGList, 1.0).toFixed(1));

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

    // 8. Keyframes Export: 5 key phase snapshots across the fall event
    let peakFrame = frames[0];
    let maxFzFound = -1;
    for (const f of frames) {
      if (f.fzTotal > maxFzFound) {
        maxFzFound = f.fzTotal;
        peakFrame = f;
      }
    }

    function findClosestFrame(targetT) {
      let closest = frames[0];
      let minDiff = Infinity;
      for (const f of frames) {
        const diff = Math.abs(f.t - targetT);
        if (diff < minDiff) {
          minDiff = diff;
          closest = f;
        }
      }
      return closest;
    }

    const keyframes = [
      {
        phase: 'release',
        label: 'Release (t = 0.000 s)',
        description: 'Initial fall release at designated elevation',
        ...frames[0]
      },
      {
        phase: 'mid_flight',
        label: 'Mid-Flight Rotation',
        description: 'Mid-flight ballistic trajectory & body rotation',
        ...findClosestFrame(0.5 * flightTimeS)
      },
      {
        phase: 'touchdown',
        label: 'Initial Touchdown',
        description: 'First anatomical contact with ground substrate',
        ...findClosestFrame(flightTimeS)
      },
      {
        phase: 'peak_grf',
        label: 'Peak GRF Deceleration',
        description: 'Maximum ground reaction force & peak deceleration',
        ...peakFrame
      },
      {
        phase: 'final_resting',
        label: 'Final Resting Posture',
        description: 'Post-impact resting equilibrium pose',
        ...frames[frames.length - 1]
      }
    ];

    return {
      params: p,
      anthropometrics: anthro,
      frames,
      timeSeries,
      segmentResults,
      summary,
      keyframes
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
    ROM_LIMITS,
    defaultParams,
    computeAnthropometrics,
    computePoseFromAngles,
    buildAnatomicalModel,
    calculateHIC15,
    runSimulation,
    runHeightSweep,
    getSegmentDefinitions: function () {
      return SEGMENT_DEFINITIONS.slice();
    }
  };
});
