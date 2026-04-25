/**
 * Estimación de pose de cabeza (yaw / pitch / roll) a partir de los
 * 68 landmarks faciales de face-api.js.
 *
 * No es full 3D (eso requiere solvePnP de OpenCV). Es una heurística
 * 2D suficiente para detectar head turns claros izq/der/arr/abj en
 * un challenge de liveness. Robusta al ~80% de poses comunes; falla
 * en gafas oscuras o oclusión severa.
 */

import type { FaceLandmarks, FaceApiPoint } from '../hooks/useFaceApi';

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

function mean(points: FaceApiPoint[]): FaceApiPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function estimateHeadPose(landmarks: FaceLandmarks): HeadPose {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();

  const leftEyeCenter = mean(leftEye);
  const rightEyeCenter = mean(rightEye);
  const noseTip = nose[nose.length - 1] ?? { x: 0, y: 0 };
  const mouthCenter = mean(mouth);
  const jawLeft = jaw[0] ?? { x: 0, y: 0 };
  const jawRight = jaw[jaw.length - 1] ?? { x: 0, y: 0 };
  const eyeMid = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };

  const eyeDx = rightEyeCenter.x - leftEyeCenter.x;
  const eyeDy = rightEyeCenter.y - leftEyeCenter.y;
  const roll = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

  const faceWidth = jawRight.x - jawLeft.x || 1;
  const noseOffset = noseTip.x - eyeMid.x;
  const yaw = (noseOffset / (faceWidth / 2)) * 45;

  const eyeToMouth = mouthCenter.y - eyeMid.y || 1;
  const noseRelative = noseTip.y - eyeMid.y;
  const expected = eyeToMouth * 0.6;
  const pitchRatio = (noseRelative - expected) / eyeToMouth;
  const pitch = pitchRatio * 60;

  return { yaw, pitch, roll };
}

export type HeadDirection = 'center' | 'left' | 'right' | 'up' | 'down';

export interface HeadDirectionThresholds {
  yawTurn: number;
  pitchTurn: number;
  centerTolerance: number;
}

export const DEFAULT_THRESHOLDS: HeadDirectionThresholds = {
  yawTurn: 15,
  pitchTurn: 12,
  centerTolerance: 8,
};

export function classifyDirection(
  pose: HeadPose,
  thresholds: HeadDirectionThresholds = DEFAULT_THRESHOLDS,
): HeadDirection {
  const { yaw, pitch } = pose;
  if (
    Math.abs(yaw) < thresholds.centerTolerance &&
    Math.abs(pitch) < thresholds.centerTolerance
  ) {
    return 'center';
  }
  if (yaw <= -thresholds.yawTurn && Math.abs(yaw) >= Math.abs(pitch)) {
    return 'left';
  }
  if (yaw >= thresholds.yawTurn && Math.abs(yaw) >= Math.abs(pitch)) {
    return 'right';
  }
  if (pitch <= -thresholds.pitchTurn) return 'up';
  if (pitch >= thresholds.pitchTurn) return 'down';
  return 'center';
}
