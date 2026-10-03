# Models

This folder should contain the YuNet ONNX model required by the app.

Place the model file here with the exact name:

- face_detection_yunet_2023mar.onnx

Where to get it:
- Download from the OpenCV model zoo or the official repository and place it under /models in the deployed site.

Why:
- The browser will fetch /models/face_detection_yunet_2023mar.onnx at startup and the detector will write it into OpenCV.js virtual FS.
