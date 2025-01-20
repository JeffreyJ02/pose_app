export const lineConnections = [
  ["nose", "left_eye"],
  ["nose", "right_eye"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "left_knee"],
  ["right_hip", "right_knee"],
  ["left_knee", "left_ankle"],
  ["right_knee", "right_ankle"],
  ["left_hip", "right_hip"],
];

// Draw keypoints and skeleton on the canvas.
export const drawKeypointsAndSkeleton = (keypoints, ctx, anglesData) => {
  const keypointsMap = createKeypointMap(keypoints);
  drawSkeleton(keypointsMap, ctx, anglesData);
  keypoints.forEach((kp) => drawKeypoint(kp, ctx));
};

// Draw skeleton lines connecting keypoints.
export const drawSkeleton = (keypointsMap, ctx, anglesData = []) => {
  ctx.lineWidth = 4;

  lineConnections.forEach(([start, end]) => {
    const a = keypointsMap[start];
    const b = keypointsMap[end];
    if (a && b && a.score > 0.3 && b.score > 0.3) {
      const angleData = anglesData.find((data) => data.joint === end); // Find the angle for this joint
      const color = angleData
        ? getLineColor(angleData.angle, angleData.thresholds)
        : "white";

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  });
};

// Get color based on angle and thresholds.
const getLineColor = (angle, thresholds) => {
  const { start, end } = thresholds;

  // Calculate normalized progress from start to end
  const progress = Math.min(1, Math.max(0, (start - angle) / (start - end)));

  if (progress < 0.5) {
    // 0-50% progress: solid white
    return "rgb(255, 255, 255)";
  } else if (progress < 1) {
    // 50%-threshold: gradient from white to yellow
    const normalized = (progress - 0.5) * 2; // Map [0.5, 1] to [0, 1]
    const red = 255;
    const green = Math.round(255 * normalized); // Increase green
    const blue = 0; // No blue in yellow
    return `rgb(${red}, ${green}, ${blue})`; // Gradient white to yellow
  } else {
    // Within threshold (>= 1): solid green
    return "rgb(0, 255, 0)";
  }
};

// Draw individual keypoint on the canvas.
export const drawKeypoint = (keypoint, ctx) => {
  if (keypoint.score > 0.3) {
    ctx.fillStyle = "White";
    ctx.beginPath();
    ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
};

/// Calculate angle between three keypoints (a, b, c).
export const calculateAngle = (a, b, c) => {
  const vectorAB = { x: b.x - a.x, y: b.y - a.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };
  const dotProduct = vectorAB.x * vectorBC.x + vectorAB.y * vectorBC.y;
  const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);

  const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
  const angleInDegrees = (angle * 180) / Math.PI;

  return 180 - angleInDegrees;
};

// Create a mapping of keypoints by their names.
export const createKeypointMap = (keypoints) =>
  keypoints.reduce((map, kp) => ({ ...map, [kp.name]: kp }), {});
