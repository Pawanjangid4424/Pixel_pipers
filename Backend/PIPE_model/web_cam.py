"""
Stand-alone demo (not used by the website): live pipe detection from a webcam.

Usage:  python web_cam.py          (default webcam)
        python web_cam.py 1        (second webcam)
Press 'q' in the video window to quit.
"""
import sys
import cv2
from ultralytics import YOLO

# Webcam number (0 = default camera) or a camera/video path, from the command line.
# Before, this was a hard-coded Linux device path that only worked on one laptop.
source = sys.argv[1] if len(sys.argv) > 1 else "0"
cap = cv2.VideoCapture(int(source) if source.isdigit() else source)

# Check if webcam is opened successfully
if not cap.isOpened():
    print("Error opening video stream or file")
    exit()

model = YOLO("best.pt")

while True:
    # Capture frame-by-frame
    ret, frame = cap.read()

    if not ret:
        print("Error reading frame from video stream or file")
        break

    results = model.predict(frame,conf=0.7, show=True)
    # print(results)

    # Press 'q' to quit
    if cv2.waitKey(1) == ord('q'):
        break

# Release the capture and close all windows
cap.release()
cv2.destroyAllWindows()
