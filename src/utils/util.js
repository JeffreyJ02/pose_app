import * as posedetection from "@tensorflow-models/pose-detection";

export function drawKeypoints(keypoints, ctx) {
  if (!keypoints) return;

  ctx.fillStyle = "Red";
  ctx.strokeStyle = "White";
  ctx.lineWidth = 2;

  // Draw a skeleton outline
  drawSkeleton(keypoints, ctx);

  // Draw each point on the canvas
  for (const i in keypoints) {
    drawKeypoint(keypoints[i], ctx);
  }
}

function drawSkeleton(keypoints, ctx, confidence = 0.3) {
  if (!keypoints) return;

  // Create a mapping of keypoints by their names for easier lookup
  const keypointsMap = keypoints.reduce((map, keypoint) => {
    map[keypoint.name] = keypoint;
    return map;
  }, {});

  // Define connections between keypoints by name
  const lineConnections = [
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

  ctx.strokeStyle = "White";
  ctx.lineWidth = 2;

  // Draw lines between connected keypoints
  lineConnections.forEach(([startName, endName]) => {
    const start = keypointsMap[startName];
    const end = keypointsMap[endName];

    if (start && end && start.score > confidence && end.score > confidence) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  });

  displayAngles(keypointsMap, ctx);

}

function displayAngles(keypointsMap, ctx) {
  // Define body segments for angle calculation
  const bodySegments = [
    {
      name: "Left Arm Angle",
      a: keypointsMap["left_shoulder"],
      b: keypointsMap["left_elbow"],
      c: keypointsMap["left_wrist"],
    },
    {
      name: "Right Arm Angle",
      a: keypointsMap["right_shoulder"],
      b: keypointsMap["right_elbow"],
      c: keypointsMap["right_wrist"],
    },
  ];

  bodySegments.forEach(({ name, a, b, c }) => {
    if (a && b && c && a.score > 0.3 && b.score > 0.3 && c.score > 0.3) {
      const angle = calculateAngle(a, b, c);
      console.log(`${name}: ${angle.toFixed(2)}°`);

      // Draw the angle text near the elbow
      ctx.fillStyle = "White";
      ctx.font = "14px Arial";
      ctx.fillText(`${angle.toFixed(2)}°`, b.x + 10, b.y - 10);
    }
  });
}


function drawKeypoint(keypoint, ctx) {
  if (!keypoint || keypoint.score < 0.3) return;
  const { y, x } = keypoint;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
  gradient.addColorStop(0, "rgba(255, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0.55)");
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill();
}

function calculateAngle(a, b, c) {
  // a, b, c are keypoints with x and y properties
  const vectorAB = { x: b.x - a.x, y: b.y - a.y };
  const vectorBC = { x: c.x - b.x, y: c.y - b.y };

  // Calculate dot product and magnitudes
  const dotProduct = vectorAB.x * vectorBC.x + vectorAB.y * vectorBC.y;
  const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);

  // Calculate the angle in radians and convert to degrees
  const angleInRadians = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
  const angleInDegrees = (angleInRadians * 180) / Math.PI;

  return angleInDegrees;
}

