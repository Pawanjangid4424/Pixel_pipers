"""
Stand-alone demo (not used by the website): count pipes in a video and save the result
to object_counting_output.avi.

Usage:  python video_yolo.py <video file>

NOTE: uses `ultralytics.solutions.object_counter`, which exists in ultralytics 8.1
(the version in ../Dockerfile). Newer ultralytics versions renamed this API.
"""
import sys
from ultralytics import YOLO
from ultralytics.solutions import object_counter
import cv2

model = YOLO("best.pt")
if len(sys.argv) < 2:
    sys.exit("Usage: python video_yolo.py <video file>")
# Before, this was a hard-coded path on the original developer's Linux machine
cap = cv2.VideoCapture(sys.argv[1])
assert cap.isOpened(), "Error reading video file"
w, h, fps = (int(cap.get(x)) for x in (cv2.CAP_PROP_FRAME_WIDTH, cv2.CAP_PROP_FRAME_HEIGHT, cv2.CAP_PROP_FPS))

# Count inside the whole frame (a smaller region can be set with the commented line)
# region_points = [(20, 400), (1080, 404), (1080, 360), (20, 360)]
region_points = [(0, 0), (w, 0), (w, h), (0, h)]


# Video writer
video_writer = cv2.VideoWriter("object_counting_output.avi",
                       cv2.VideoWriter_fourcc(*'mp4v'),
                       fps,
                       (w, h))

# Init Object Counter
counter = object_counter.ObjectCounter()
counter.set_args(view_img=True,
                 reg_pts=region_points,
                 classes_names=model.names,
                 draw_tracks=True)

while cap.isOpened():
    success, im0 = cap.read()
    if not success:
        print("Video frame is empty or video processing has been successfully completed.")
        break
    tracks = model.track(im0, persist=True, show=False,conf=.3)

    im0 = counter.start_counting(im0, tracks)
    video_writer.write(im0)

cap.release()
video_writer.release()
cv2.destroyAllWindows()