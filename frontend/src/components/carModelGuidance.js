export function parseAngleFromInstruction(instruction = '') {
  const text = instruction.toLowerCase();

  if (/\b(top|roof|above|overhead|aerial|bird.?s?.?eye)\b/.test(text)) {
    return { rotateY: 0, rotateX: -45, label: 'Top view' };
  }

  if (/\b(under|beneath|below|underneath|suspension|chassis)\b/.test(text)) {
    return { rotateY: 0, rotateX: 45, label: 'Underside' };
  }

  if (/\b(front|headlight|bumper|hood|grille|bonnet|engine bay|radiator|windshield)\b/.test(text)) {
    return { rotateY: 90, rotateX: 0, label: 'Front view' };
  }

  if (/\b(rear|tail|trunk|boot|exhaust|back|licence plate|license plate|tailgate)\b/.test(text)) {
    return { rotateY: -90, rotateX: 0, label: 'Rear view' };
  }

  if (/\b(right side|passenger side|right fender|right door)\b/.test(text)) {
    return { rotateY: 180, rotateX: 0, label: 'Right side' };
  }

  if (/\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: 30, rotateX: 0, label: 'Wheel area' };
  }

  if (/\b(left side|driver side|left fender|left door)\b/.test(text)) {
    return { rotateY: 0, rotateX: 0, label: 'Left side' };
  }

  return { rotateY: 0, rotateX: 0, label: '' };
}

export function buildGuidanceFromInstruction(instruction = '') {
  const parsed = parseAngleFromInstruction(instruction);
  const text = instruction.toLowerCase();

  let targetView = 'left';
  let animation = 'pulse-side';
  let focusArea = 'body panel';
  let captureHint = instruction;
  let hotspotId = '';

  if (/\b(front|headlight|bumper|hood|grille|bonnet)\b/.test(text)) {
    targetView = 'front';
    animation = 'pulse-front';
    focusArea = 'front fascia';
  } else if (/\b(rear|tail|trunk|boot|exhaust|back|tailgate)\b/.test(text)) {
    targetView = 'rear';
    animation = 'pulse-rear';
    focusArea = 'rear fascia';
  } else if (/\b(right side|passenger side)\b/.test(text)) {
    targetView = 'right';
    animation = 'rotate-right';
    focusArea = 'passenger side';
  } else if (/\b(top|roof|overhead|above)\b/.test(text)) {
    targetView = 'top';
    animation = 'pulse-roof';
    focusArea = 'roof area';
  } else if (/\b(under|underneath|below)\b/.test(text)) {
    targetView = 'underbody';
    animation = 'tilt-down';
    focusArea = 'underside';
  } else if (/\b(wheel|tire|tyre|rim|hub|brake)\b/.test(text)) {
    targetView = 'wheel_closeup';
    animation = 'pulse-wheel';
    focusArea = 'wheel area';
  }

  if (/\b(engine|hood|bonnet|spark|coil)\b/.test(text)) {
    hotspotId = 'engine_bay';
  } else if (/\b(radiator|coolant|grille)\b/.test(text)) {
    hotspotId = 'radiator_front';
  } else if (/\b(battery|terminal)\b/.test(text)) {
    hotspotId = 'battery_area';
  } else if (/\b(exhaust|muffler|tailpipe)\b/.test(text)) {
    hotspotId = 'exhaust_rear';
  } else if (/\b(under|underneath|below|chassis|subframe)\b/.test(text)) {
    hotspotId = 'underbody_mid';
  } else if (/\b(roof|sunroof)\b/.test(text)) {
    hotspotId = 'roof_center';
  } else if (/\b(rear).*\b(left|driver)\b.*\b(suspension|wheel|brake|shock|strut)\b/.test(text)) {
    hotspotId = 'rear_left_suspension';
  } else if (/\b(rear).*\b(right|passenger)\b.*\b(suspension|wheel|brake|shock|strut)\b/.test(text)) {
    hotspotId = 'rear_right_suspension';
  } else if (/\b(right|passenger)\b.*\b(front|wheel|brake|tire|tyre)\b/.test(text)) {
    hotspotId = 'front_right_brake';
  } else if (/\b(left|driver)\b.*\b(front|wheel|brake|tire|tyre)\b/.test(text) || /\b(wheel|brake|tire|tyre|rim|hub)\b/.test(text)) {
    hotspotId = 'front_left_brake';
  }

  return {
    headline: parsed.label || 'Requested angle',
    targetView,
    hotspotId,
    rotationY: parsed.rotateY,
    tiltX: parsed.rotateX,
    focusArea,
    captureHint,
    animation,
  };
}
