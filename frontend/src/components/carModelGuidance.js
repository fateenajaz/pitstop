export function parseAngleFromInstruction(instruction = '') {
  const text = instruction.toLowerCase();

  if (/\b(top|roof|above|overhead|aerial|bird.?s?.?eye)\b/.test(text)) {
    return { rotateY: 0, rotateX: -45, label: 'Top view' };
  }

  if (/\b(under|beneath|below|underneath|suspension|chassis)\b/.test(text)) {
    return { rotateY: 0, rotateX: 45, label: 'Underside' };
  }

  if (/\b(front|headlight|bumper|hood|grille|bonnet|engine bay|radiator|windshield|windscreen)\b/.test(text)) {
    return { rotateY: 90, rotateX: 0, label: 'Front view' };
  }

  if (/\b(rear|tail|trunk|boot|exhaust|back|licence plate|license plate|tailgate)\b/.test(text)) {
    return { rotateY: -90, rotateX: 0, label: 'Rear view' };
  }

  if (/\b(right side|passenger side|right fender|right door|passenger door)\b/.test(text)) {
    return { rotateY: 180, rotateX: 0, label: 'Right side' };
  }

  if (/\b(front).*\b(left|driver)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b|\b(left|driver).*\bfront\b.*\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: 18, rotateX: 0, label: 'Front left wheel' };
  }

  if (/\b(front).*\b(right|passenger)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b|\b(right|passenger).*\bfront\b.*\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: 112, rotateX: 0, label: 'Front right wheel' };
  }

  if (/\b(rear|back).*\b(left|driver)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b|\b(left|driver).*\b(rear|back)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: -28, rotateX: 0, label: 'Rear left wheel' };
  }

  if (/\b(rear|back).*\b(right|passenger)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b|\b(right|passenger).*\b(rear|back)\b.*\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: 208, rotateX: 0, label: 'Rear right wheel' };
  }

  if (/\b(wheel|tire|tyre|brake|rim|hub)\b/.test(text)) {
    return { rotateY: 18, rotateX: 0, label: 'Wheel area' };
  }

  if (/\b(left side|driver side|left fender|left door|driver door)\b/.test(text)) {
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

  if (/\b(battery|terminal)\b/.test(text)) {
    hotspotId = 'battery_area';
    focusArea = 'battery';
  } else if (/\b(coolant|reservoir|overflow tank)\b/.test(text)) {
    hotspotId = 'coolant_reservoir';
    focusArea = 'coolant reservoir';
  } else if (/\b(dipstick|oil level)\b/.test(text)) {
    hotspotId = 'oil_dipstick';
    focusArea = 'oil dipstick';
  } else if (/\b(oil cap|filler cap|engine oil)\b/.test(text)) {
    hotspotId = 'engine_oil_cap';
    focusArea = 'oil cap';
  } else if (/\b(air filter|intake box|filter box)\b/.test(text)) {
    hotspotId = 'air_filter_box';
    focusArea = 'air filter box';
  } else if (/\b(engine|hood|bonnet|spark|coil)\b/.test(text)) {
    hotspotId = 'engine_bay';
    focusArea = 'engine bay';
  } else if (/\b(radiator|coolant|grille)\b/.test(text)) {
    hotspotId = 'radiator_front';
    focusArea = 'radiator';
  } else if (/\b(exhaust|muffler|tailpipe)\b/.test(text)) {
    hotspotId = 'exhaust_rear';
    focusArea = 'exhaust';
  } else if (/\bfront\b.*\b(under|underneath|below|chassis|subframe)\b/.test(text)) {
    hotspotId = 'underbody_front';
    focusArea = 'front underside';
  } else if (/\b(rear|back)\b.*\b(under|underneath|below|chassis|subframe)\b/.test(text)) {
    hotspotId = 'underbody_rear';
    focusArea = 'rear underside';
  } else if (/\b(under|underneath|below|chassis|subframe)\b/.test(text)) {
    hotspotId = 'underbody_mid';
    focusArea = 'underbody';
  } else if (/\b(roof|sunroof)\b/.test(text)) {
    hotspotId = 'roof_center';
    focusArea = 'roof';
  } else if (/\b(windshield|windscreen|front glass)\b/.test(text)) {
    hotspotId = 'windshield';
    focusArea = 'windshield';
  } else if (/\b(trunk|boot|tailgate)\b/.test(text)) {
    hotspotId = 'trunk_area';
    focusArea = 'trunk area';
  } else if (/\b(front bumper|front fascia)\b/.test(text)) {
    hotspotId = 'front_bumper';
    focusArea = 'front bumper';
  } else if (/\b(rear bumper|back bumper)\b/.test(text)) {
    hotspotId = 'rear_bumper';
    focusArea = 'rear bumper';
  } else if (/\b(driver door|driver side door)\b/.test(text)) {
    hotspotId = 'driver_door';
    focusArea = 'driver door';
  } else if (/\b(passenger door|passenger side door)\b/.test(text)) {
    hotspotId = 'passenger_door';
    focusArea = 'passenger door';
  } else if (/\b(left|driver)\b.*\b(panel|body|fender|door)\b/.test(text)) {
    hotspotId = 'left_body_panel';
    focusArea = 'left body panel';
  } else if (/\b(right|passenger)\b.*\b(panel|body|fender|door)\b/.test(text)) {
    hotspotId = 'right_body_panel';
    focusArea = 'right body panel';
  } else if (/\b(rear).*\b(left|driver)\b.*\b(brake|rotor|caliper|pad)\b/.test(text)) {
    hotspotId = 'rear_left_brake';
    focusArea = 'rear left brake';
  } else if (/\b(rear).*\b(right|passenger)\b.*\b(brake|rotor|caliper|pad)\b/.test(text)) {
    hotspotId = 'rear_right_brake';
    focusArea = 'rear right brake';
  } else if (/\b(front).*\b(right|passenger)\b.*\b(brake|rotor|caliper|pad)\b/.test(text)) {
    hotspotId = 'front_right_brake';
    focusArea = 'front right brake';
  } else if (/\b(front).*\b(left|driver)\b.*\b(brake|rotor|caliper|pad)\b/.test(text)) {
    hotspotId = 'front_left_brake';
    focusArea = 'front left brake';
  } else if (/\b(rear).*\b(left|driver)\b.*\b(suspension|shock|strut|spring|control arm)\b/.test(text)) {
    hotspotId = 'rear_left_suspension';
    focusArea = 'rear left suspension';
  } else if (/\b(rear).*\b(right|passenger)\b.*\b(suspension|shock|strut|spring|control arm)\b/.test(text)) {
    hotspotId = 'rear_right_suspension';
    focusArea = 'rear right suspension';
  } else if (/\b(front).*\b(right|passenger)\b.*\b(suspension|shock|strut|spring|control arm)\b/.test(text)) {
    hotspotId = 'front_right_suspension';
    focusArea = 'front right suspension';
  } else if (/\b(front).*\b(left|driver)\b.*\b(suspension|shock|strut|spring|control arm)\b/.test(text)) {
    hotspotId = 'front_left_suspension';
    focusArea = 'front left suspension';
  } else if (/\b(rear).*\b(left|driver)\b.*\b(wheel|tire|tyre|rim|hub)\b/.test(text)) {
    hotspotId = 'rear_left_tire';
    focusArea = 'rear left tire';
  } else if (/\b(rear).*\b(right|passenger)\b.*\b(wheel|tire|tyre|rim|hub)\b/.test(text)) {
    hotspotId = 'rear_right_tire';
    focusArea = 'rear right tire';
  } else if (/\b(right|passenger)\b.*\b(front|wheel|tire|tyre|rim|hub)\b/.test(text)) {
    hotspotId = 'front_right_tire';
    focusArea = 'front right tire';
  } else if (/\b(left|driver)\b.*\b(front|wheel|tire|tyre|rim|hub)\b/.test(text) || /\b(wheel|tire|tyre|rim|hub)\b/.test(text)) {
    hotspotId = 'front_left_tire';
    focusArea = 'front left tire';
  } else if (/\b(brake|rotor|caliper|pad)\b/.test(text)) {
    hotspotId = 'front_left_brake';
    focusArea = 'front left brake';
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
