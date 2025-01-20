"use client";

// Import dependencies

// React dependencies
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";

// Tensorflow and ML dependencies
import * as mpPose from "@mediapipe/pose";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";
import {
  drawKeypointsAndSkeleton,
  createKeypointMap,
  calculateAngle,
} from "../../../utils/util.js";
import Sidebar, { SidebarItem } from "./Sidebar.js";

// UI dependencies
import {
  Box,
  Button,
  Typography,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import {
  HomeOutlined,
  FitnessCenter,
  PlayArrow,
  Pause,
} from "@mui/icons-material";
import { ReactComponent as DumbbellIcon } from "./dumbbell.svg";

const exerciseCalculations = {
  bicepsCurl: {
    angles: [
      ["left_shoulder", "left_elbow", "left_wrist"],
      ["right_shoulder", "right_elbow", "right_wrist"],
    ],
    displayAngle: true,
    thresholds: {
      start: 150,
      end: 30,
    },
  },
};

export default function Workout() {
  // Set up references
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const exerciseStatesRef = useRef({});

  // React States
  const [isDetecting, setIsDetecting] = useState(true);
  const [isWebcamOn, setIsWebcamOn] = useState(true);
  const [openDrawer, setOpenDrawer] = useState(true);
  const [activeExercise, setActiveExercise] = useState(null);
  const [repCounts, setRepCounts] = useState({});

  // Constants
  const drawerBleeding = 56;


  // POSE DETECTION FUNCTIONS

  // Load Pose Detection, useEffect runs once
  useEffect(() => {
    const runPoseDetection = async () => {
      try {
        // Setup tf backend
        await tf.setBackend("webgl");
        await tf.ready();

        // Detector settings
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          runtime: "tfjs",
        };

        // Assign detector to ref
        detectorRef.current = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );

        console.log("MoveNet detector loaded");
      } catch (error) {
        console.error("Error loading MoveNet: ", error);
      }
    };

    runPoseDetection();
  }, []);

  // Detect poses on webcam feed, draw keypoints on canvas
  const detect = async () => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // TODO: Test if frames need to be int32 tensor of 192x192
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      //console.log(videoWidth, videoHeight);

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set Canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Perform pose detection on the video
      const poses = await detectorRef.current.estimatePoses(video);

      // Draw the poses on the canvas
      if (poses.length > 0) {
        const filteredPoses = filterKeypoints(poses, activeExercise);
        drawCanvas(filteredPoses, video, canvasRef.current);
      }
    }
  };

  // Filter out irrelevant keypoints for the current exercise
  const filterKeypoints = (poses, exercise) => {
    // If no exercise is selected, return all poses
    if (!exercise || !exerciseCalculations[exercise]) return poses;

    // Get the required keypoints for the exercise
    const requiredKeypoints = new Set(
      exerciseCalculations[exercise].angles.flat()
    );

    // Filter out irrelevant keypoints and those with low confidence
    return poses.map((pose) => ({
      ...pose,
      keypoints: pose.keypoints.filter(
        (kp) => requiredKeypoints.has(kp.name) && kp.score > 0.3
      ),
    }));
  };

  // Calculate angles between keypoints
  const calculateAngles = (poses, ctx) => {
    // If no exercise is selected or no calculations are available, return
    if (!activeExercise || !exerciseCalculations[activeExercise]) return;

    // Get the required angles and whether to display them
    const { angles, displayAngle, thresholds } =
      exerciseCalculations[activeExercise];

    // Data to store the angles
    const anglesData = [];

    poses.forEach((pose) => {
      const keypointsMap = createKeypointMap(pose.keypoints);

      angles.forEach(([a, b, c]) => {
        if (keypointsMap[a] && keypointsMap[b] && keypointsMap[c]) {
          const angle = calculateAngle(
            keypointsMap[a],
            keypointsMap[b],
            keypointsMap[c]
          );

          // Store the angle data for color
          anglesData.push({ joint: b, angle, thresholds });

          // Display the angle near the corresponding joint (keypoint b)
          if (displayAngle && ctx) {
            ctx.fillStyle = "White";
            ctx.font = "14px Arial";
            ctx.fillText(
              `${angle.toFixed(2)}°`,
              keypointsMap[b].x + 10,
              keypointsMap[b].y - 10
            );
          }

          // Counts reps if threshold is reached
          if (
            angle < thresholds.end &&
            exerciseStatesRef.current[b] == "start"
          ) {
            updateJointState(b, "end");
            console.log(`${b} state changed to: end`);
            setRepCounts((prev) => ({
              ...prev,
              [activeExercise]: (prev[activeExercise] || 0) + 1,
            }));
          } else if (
            angle > thresholds.start &&
            exerciseStatesRef.current[b] == "end"
          ) {
            updateJointState(b, "start");
            console.log(`${b} state changed to: start`);
          }
        }
      });
    });

    return anglesData;
  };

  const updateJointState = (joint, newState) => {
    if (exerciseStatesRef.current[joint] !== newState) {
      exerciseStatesRef.current[joint] = newState;
      console.log(`${joint} state updated to:`, newState);
    }
  };

  // Draw keypoints and skeleton on the canvas
  const drawCanvas = (poses, video, canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Calculate and optionally display angles
    const anglesData = calculateAngles(poses, ctx);

    // Draw keypoints and skeleton
    poses.forEach((pose) => drawKeypointsAndSkeleton(pose.keypoints, ctx, anglesData));
  };

  // Initialize states and reps when exercise changes
  useEffect(() => {
    if (activeExercise) {
      // Initialize states for all joints
      exerciseStatesRef.current = {};
      exerciseCalculations[activeExercise].angles.forEach(([_, joint]) => {
        exerciseStatesRef.current[joint] = "start";
      });
      console.log("Initialized exerciseStatesRef:", exerciseStatesRef.current);
    }
  }, [activeExercise]);

  useEffect(() => {
    if (isDetecting) {
      const interval = setInterval(() => {
        detect();
      }, 100); // Run detection every 100ms
      return () => clearInterval(interval);
    }
  }, [isDetecting, activeExercise]);

  // UI FUNCTIONS

  const toggleWebcam = () => {
    if (webcamRef.current) {
      if (isWebcamOn) {
        webcamRef.current.video.pause();
        setIsWebcamOn(false);
        setIsDetecting(false);
      } else {
        webcamRef.current.video.play();
        setIsWebcamOn(true);
        setIsDetecting(true);
      }
    }
  };

  const handleStopDetection = () => {
    setIsDetecting(!isDetecting);
    toggleWebcam();
  };

  const toggleDrawer = () => {
    setOpenDrawer(!openDrawer);
  };

  const workouts = [
    {
      id: "bicepsCurl",
      name: "Biceps Curl",
      icon: (
        <svg
          viewBox="0 0 100 100"
          width="24"
          strokeWidth="5"
          height="24"
          fill="currentColor"
        >
          <path d="M95,40.88a8,8,0,0,0-8-8H84.74a8,8,0,0,0-7.74-6h-.5a8,8,0,0,0-8,8v5.38h-37V34.88a8,8,0,0,0-8-8H23a8,8,0,0,0-7.74,6H13a8,8,0,0,0-8,8V59.13a8,8,0,0,0,8,8h2.26a8,8,0,0,0,7.74,6h.5a8,8,0,0,0,8-8V59.75h37v5.37a8,8,0,0,0,8,8H77a8,8,0,0,0,7.74-6H87a8,8,0,0,0,8-8ZM9,59.13V40.88a4,4,0,0,1,4-4h2V63.13H13A4,4,0,0,1,9,59.13Zm18.5,6a4,4,0,0,1-4,4H23a4,4,0,0,1-4-4V34.88a4,4,0,0,1,4-4h.5a4,4,0,0,1,4,4Zm4-9.37V44.25h37v11.5ZM81,65.13a4,4,0,0,1-4,4h-.5a4,4,0,0,1-4-4V34.88a4,4,0,0,1,4-4H77a4,4,0,0,1,4,4Zm10-6a4,4,0,0,1-4,4H85V36.88h2a4,4,0,0,1,4,4Z" />
        </svg>
      ),
    },
    {
      id: "pushUp",
      name: "Push Up",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          fill="currentColor"
          width="24"
          height="24"
        >
          <g>
            <ellipse
              cx="87.8"
              cy="34.3"
              rx="9.7"
              ry="9.7"
              transform="rotate(-45 87.8 34.3)"
            />
            <path d="M93.7,71.5H85c2-1.3,2.6-3.9,1.4-6L81,56.8l-0.8-7.2c-0.1-1.4-0.8-3.5-1.4-4.7c-3.6-6.9-3.9-7.1-4.7-7.8c-1.8-1.6-4-2.2-6.8-1.2S49,42.4,49,42.4c-2.2,0.8-4.1,2.1-5.6,3.9l-6.8,7.9c-0.3,0.4-0.8,0.7-1.3,0.9l-21.9,7.4c-2.6,0.9-4.1,3.8-3.2,6.4c0.4,1.2,1.3,2.2,2.3,2.8H4.5c-1.1,0-2,0.9-2,2c0,1.1,0.9,2,2,2h89.2c1.1,0,2-0.9,2-2C95.7,72.4,94.8,71.5,93.7,71.5ZM80.3,71.5H17.9l54-18.2l0.5,4.3c0.1,1.3,0.6,2.6,1.3,3.7l5.3,8.7C79.3,70.7,79.8,71.2,80.3,71.5Z" />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <main>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "white",
        }}
      >
        <Sidebar>
          <SidebarItem
            icon={<HomeOutlined />}
            text="Home"
            onClick={() => console.log("Go Home")}
          />
          {workouts.map((workout) => (
            <SidebarItem
              key={workout.id}
              icon={workout.icon}
              text={workout.name}
              onClick={() => {
                setActiveExercise(workout.id);
                console.log("Active Exercise: ", workout.name);
              }}
            />
          ))}
        </Sidebar>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
          }}
        >
          <Typography variant="h4" sx={{ marginBottom: 3 }}>
            Workout Pose Trainer
          </Typography>
          <Box
            sx={{
              position: "relative",
              width: 640,
              height: 480,
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
              backgroundColor: "#000",
            }}
          >
            <Webcam
              ref={webcamRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
            <Typography
              variant="h5"
              sx={{
                position: "absolute",
                top: 20,
                left: 20,
                color: "black",
              }}
            >
              Reps: {repCounts[activeExercise] || 0}
            </Typography>
            {isWebcamOn ? (
              <IconButton
                sx={{
                  transition: "opacity 0.3s ease-in-out",
                  opacity: isWebcamOn ? 1 : 0,
                  position: "absolute",
                  top: 430,
                  left: 590,
                  color: "white",
                }}
                onClick={toggleWebcam}
                color="primary"
              >
                <Pause
                  sx={{
                    fontSize: "2rem",
                  }}
                />
              </IconButton>
            ) : (
              <IconButton
                sx={{
                  transition: "opacity 0.3s ease-in-out",
                  opacity: !isWebcamOn ? 1 : 0,
                  position: "absolute",
                  top: 430,
                  left: 590,
                  color: "white",
                }}
                onClick={toggleWebcam}
                color="primary"
              >
                <PlayArrow
                  sx={{
                    fontSize: "2rem",
                  }}
                />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
    </main>
  );
}

/*
  SVG Citations

  workout by Adrien Coquet from <a href="https://thenounproject.com/browse/icons/term/workout/" target="_blank" title="workout Icons">Noun Project</a> (CC BY 3.0)
  workout by Popular from <a href="https://thenounproject.com/browse/icons/term/workout/" target="_blank" title="workout Icons">Noun Project</a> (CC BY 3.0)
  */