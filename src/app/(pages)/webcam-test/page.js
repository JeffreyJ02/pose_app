"use client";

// Import dependencies
import React, { useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as mpPose from "@mediapipe/pose";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";
//import '@tensorflow/tfjs-backend-wasm';

export default function WebcamTest() {
  // Set up references
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);

  // Load Pose Detection
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

  // Detect function
  const detect = async () => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set Canvas width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Perform pose detection on the video
      const poses = await detectorRef.current.estimatePoses(video);
      console.log(poses);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      detect();
    }, 100); // Run detection every 100ms
    return () => clearInterval(interval);
  }, []);

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
    </main>
  );
}
