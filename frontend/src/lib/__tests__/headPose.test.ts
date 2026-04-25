import {
  classifyDirection,
  DEFAULT_THRESHOLDS,
  estimateHeadPose,
} from '../headPose';
import type { FaceApiPoint, FaceLandmarks } from '../../hooks/useFaceApi';

function makeLandmarks(opts: {
  leftEye: FaceApiPoint;
  rightEye: FaceApiPoint;
  noseTip: FaceApiPoint;
  mouthCenter: FaceApiPoint;
  jawLeft: FaceApiPoint;
  jawRight: FaceApiPoint;
}): FaceLandmarks {
  const leftEye = [opts.leftEye, opts.leftEye, opts.leftEye, opts.leftEye];
  const rightEye = [opts.rightEye, opts.rightEye, opts.rightEye, opts.rightEye];
  const nose = [opts.noseTip, opts.noseTip, opts.noseTip, opts.noseTip];
  const mouth = [
    opts.mouthCenter,
    opts.mouthCenter,
    opts.mouthCenter,
    opts.mouthCenter,
  ];
  const jaw = [opts.jawLeft, opts.jawLeft, opts.jawRight, opts.jawRight];
  return {
    positions: [],
    getJawOutline: () => jaw,
    getNose: () => nose,
    getLeftEye: () => leftEye,
    getRightEye: () => rightEye,
    getMouth: () => mouth,
  };
}

describe('estimateHeadPose', () => {
  it('da pose centrada cuando rostro está frontal', () => {
    const landmarks = makeLandmarks({
      leftEye: { x: 80, y: 100 },
      rightEye: { x: 120, y: 100 },
      noseTip: { x: 100, y: 130 },
      mouthCenter: { x: 100, y: 150 },
      jawLeft: { x: 60, y: 140 },
      jawRight: { x: 140, y: 140 },
    });
    const pose = estimateHeadPose(landmarks);
    expect(Math.abs(pose.yaw)).toBeLessThan(8);
    expect(Math.abs(pose.roll)).toBeLessThan(5);
  });

  it('detecta yaw positivo cuando nariz se desplaza a la derecha', () => {
    const landmarks = makeLandmarks({
      leftEye: { x: 80, y: 100 },
      rightEye: { x: 120, y: 100 },
      noseTip: { x: 130, y: 130 },
      mouthCenter: { x: 100, y: 150 },
      jawLeft: { x: 60, y: 140 },
      jawRight: { x: 140, y: 140 },
    });
    const pose = estimateHeadPose(landmarks);
    expect(pose.yaw).toBeGreaterThan(15);
  });

  it('detecta yaw negativo cuando nariz se desplaza a la izquierda', () => {
    const landmarks = makeLandmarks({
      leftEye: { x: 80, y: 100 },
      rightEye: { x: 120, y: 100 },
      noseTip: { x: 70, y: 130 },
      mouthCenter: { x: 100, y: 150 },
      jawLeft: { x: 60, y: 140 },
      jawRight: { x: 140, y: 140 },
    });
    const pose = estimateHeadPose(landmarks);
    expect(pose.yaw).toBeLessThan(-15);
  });

  it('detecta roll cuando ojos están inclinados', () => {
    const landmarks = makeLandmarks({
      leftEye: { x: 80, y: 110 },
      rightEye: { x: 120, y: 90 },
      noseTip: { x: 100, y: 130 },
      mouthCenter: { x: 100, y: 150 },
      jawLeft: { x: 60, y: 140 },
      jawRight: { x: 140, y: 140 },
    });
    const pose = estimateHeadPose(landmarks);
    expect(Math.abs(pose.roll)).toBeGreaterThan(10);
  });
});

describe('classifyDirection', () => {
  it('center cuando yaw y pitch están dentro de tolerancia', () => {
    const dir = classifyDirection({ yaw: 2, pitch: 3, roll: 0 });
    expect(dir).toBe('center');
  });

  it('left cuando yaw es negativo y dominante', () => {
    const dir = classifyDirection({ yaw: -25, pitch: 5, roll: 0 });
    expect(dir).toBe('left');
  });

  it('right cuando yaw es positivo y dominante', () => {
    const dir = classifyDirection({ yaw: 25, pitch: 5, roll: 0 });
    expect(dir).toBe('right');
  });

  it('up cuando pitch es negativo', () => {
    const dir = classifyDirection({ yaw: 5, pitch: -20, roll: 0 });
    expect(dir).toBe('up');
  });

  it('down cuando pitch es positivo', () => {
    const dir = classifyDirection({ yaw: 5, pitch: 20, roll: 0 });
    expect(dir).toBe('down');
  });

  it('respeta thresholds custom', () => {
    const strict = { ...DEFAULT_THRESHOLDS, yawTurn: 30 };
    const dir = classifyDirection({ yaw: 20, pitch: 0, roll: 0 }, strict);
    expect(dir).toBe('center');
  });
});
