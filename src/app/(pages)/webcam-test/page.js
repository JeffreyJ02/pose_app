"use client";

// Import dependencies
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as mpPose from "@mediapipe/pose";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";
import { drawKeypoints } from "../../../utils/util.js";

export default function WebcamTest() {
  // Set up references
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);

  // State for detecting poses
  const [isDetecting, setIsDetecting] = useState(true);

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

  /*
    Detect poses on webcam feed, draw keypoints on canvas
  */
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
      console.log(poses);

      drawCanvas(poses, video, videoWidth, videoHeight, canvasRef);
    }
  };

  const keypointCalculations = (poses) => {
    poses.forEach((pose) => {

      const keypoints = [
        "nose",
        "leftEye",
        "rightEye",
        "leftEar",
        "rightEar",
        "leftShoulder",
        "rightShoulder",
        "leftElbow",
        "rightElbow",
        "leftWrist",
        "rightWrist",
        "leftHip",
        "rightHip",
        "leftKnee",
        "rightKnee",
        "leftAnkle",
        "rightAnkle",
      ];

      const keypointVars = {};
      keypoints.forEach((keypoint, index) => {
        keypointVars[keypoint] = pose.keypoints[index];
      });

      console.log(keypointVars);
    });

    // Calculate distances between keypoints
    
  };

  const drawCanvas = (poses, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    // Draw the video frame to the canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    keypointCalculations(poses);
    // Draw keypoints for each pose
    poses.forEach((pose) => {
      drawKeypoints(pose.keypoints, ctx);
    });
  };

  useEffect(() => {
    if (isDetecting) {
      const interval = setInterval(() => {
        detect();
      }, 100); // Run detection every 100ms
      return () => clearInterval(interval);
    }
  }, [isDetecting]);

  const handleStopDetection = () => {
    setIsDetecting(false);
  };

  return (
    <main>
      <h1>Webcam Test</h1>
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 9,
          width: 640,
          height: 480,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 9,
          width: 640,
          height: 480,
        }}
      />
      <button onClick={handleStopDetection}>Stop Detection</button>
    </main>
  );
}
