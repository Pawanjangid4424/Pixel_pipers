/**
 * Image Annotation Tool (opens in a modal from the result card).
 *
 * Lets the user draw boxes around pipes the model missed. For every box it shows the
 * YOLO-format numbers (centre x/y + width/height, all 0–1 relative to the image size) –
 * the same format the backend uses in its label .txt files for retraining (/retrain).
 *
 * How drawing works:
 *  mouse/touch down on the image → remember start point
 *  move                          → update end point (clamped inside the image), draw live box
 *  up                            → show Annotate / Cancel buttons
 *  Annotate                      → save the box and print its YOLO coordinates
 *
 * Responsive: the image is `w-full max-w-[500px]` instead of a fixed 500px, so the modal
 * fits on phones, and `touch-none` stops the page from scrolling while drawing with a finger.
 */
import React, { useRef, useState } from 'react';
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { Icon } from '@iconify/react/dist/iconify.js';
import { DemoBtn } from '@/components';

interface Coordinates {
  x: number;
  y: number;
}

interface Annotation {
  id: number;
  coordinates: Coordinates; // where the drag started
  endCoordinates: Coordinates; // where the drag ended
  option: string | null;
}

interface ImageAnnotationProps {
  image_url: string;
}

const ImageAnnotation: React.FC<ImageAnnotationProps> = ({ image_url }) => {
  const [open, setOpen] = useState(false);
  const [startCoordinates, setStartCoordinates] = useState<Coordinates>({ x: 0, y: 0 });
  const [endCoordinates, setEndCoordinates] = useState<Coordinates>({ x: 0, y: 0 });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showBox, setShowBox] = useState<boolean>(false); // live box while dragging
  const [showControls, setShowControls] = useState<boolean>(false); // Annotate / Cancel
  const [clickedCoordinate, setClickedCoordinate] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [nextId, setNextId] = useState<number>(1);
  // Displayed image size at the moment drawing started (needed to normalise to 0–1)
  const [h, setH] = useState<number>(0);
  const [w, setW] = useState<number>(0);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageMouseDown = (
    e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>
  ) => {
    const imageElement = imageRef.current;
    if (!imageElement) return;

    const imageRect = imageElement.getBoundingClientRect();
    setH(imageRect.height);
    setW(imageRect.width);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // Position relative to the image's top-left corner
    const startX = clientX - imageRect.left;
    const startY = clientY - imageRect.top;
    setStartCoordinates({ x: startX, y: startY });
    setEndCoordinates({ x: startX, y: startY });
    setShowBox(true);

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      let boundedX, boundedY;

      if ('touches' in e) {
        boundedX = e.touches[0].clientX - imageRect.left;
        boundedY = e.touches[0].clientY - imageRect.top;
      } else {
        boundedX = e.clientX - imageRect.left;
        boundedY = e.clientY - imageRect.top;
      }

      // Keep the box inside the image
      boundedX = Math.max(0, Math.min(boundedX, imageRect.width));
      boundedY = Math.max(0, Math.min(boundedY, imageRect.height));
      setEndCoordinates({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setShowBox(true);
      setShowControls(true);

      // Stop listening until the next drag
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    // Listen on window so the drag keeps working if the pointer leaves the image
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
  };

  /**
   * Convert a pixel box to YOLO format (all values relative to image size, 0–1).
   * Works for boxes drawn in any direction (e.g. bottom-right to top-left).
   */
  function get_yolo_annotation_info(
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    image_width: number,
    image_height: number
  ) {
    const box_width = Math.abs(end_x - start_x);
    const box_height = Math.abs(end_y - start_y);
    const left = Math.min(start_x, end_x);
    const top = Math.min(start_y, end_y);

    return {
      center_x: (left + box_width / 2) / image_width,
      center_y: (top + box_height / 2) / image_height,
      width: box_width / image_width,
      height: box_height / image_height,
    };
  }

  // "Annotate" – save the drawn box
  const handleTicButtonClick = () => {
    // Bug fix: width and height were passed in the wrong order before
    const yolo = get_yolo_annotation_info(
      startCoordinates.x,
      startCoordinates.y,
      endCoordinates.x,
      endCoordinates.y,
      w,
      h
    );

    const newAnnotation: Annotation = {
      id: nextId,
      coordinates: startCoordinates,
      endCoordinates: endCoordinates,
      option: selectedOption,
    };

    setAnnotations([...annotations, newAnnotation]);
    setNextId(nextId + 1);
    setClickedCoordinate(
      `Coordinate: (${yolo.center_x.toFixed(4)}, ${yolo.center_y.toFixed(4)}), ` +
        `Dimension: (${yolo.width.toFixed(4)}, ${yolo.height.toFixed(4)})`
    );
    setShowBox(false);
    setShowControls(false);
  };

  // "Cancel" – throw away the box being drawn
  const handleCrossButtonClick = () => {
    setClickedCoordinate(null);
    setShowBox(false);
    setShowControls(false);
    setSelectedOption(null);
  };

  const handleRemoveAnnotations = () => {
    setAnnotations([]);
    setShowBox(false);
    setShowControls(false);
    setClickedCoordinate(null);
  };

  // Closing the modal clears everything
  const handleClick = () => {
    setOpen(false);
    setAnnotations([]);
  };

  // NOTE: "Send" only closes the modal for now – it does not upload to /retrain yet
  const sendClick = () => {
    setOpen(false);
    setAnnotations([]);
  };

  return (
    <>
      <DemoBtn onClick={() => setOpen(true)} className="h-10 w-40">
        Open Annotation
      </DemoBtn>
      <Modal open={open} onClose={handleClick} center>
        <div className="image-annotation-container w-full max-w-[500px]">
          <h2 className="text-center font-bold text-lg sm:text-xl text-gray-900 mb-2 pr-6">
            Image Annotation Tool
          </h2>
          <div className="relative cursor-crosshair">
            <img
              ref={imageRef}
              src={image_url}
              alt="Annotated Image"
              onMouseDown={handleImageMouseDown}
              onTouchStart={handleImageMouseDown}
              draggable={false}
              className="w-full h-auto select-none touch-none"
            />
            {/* Saved boxes */}
            {annotations.map(annotation => (
              <div
                key={annotation.id}
                style={{
                  position: 'absolute',
                  top: Math.min(annotation.coordinates.y, annotation.endCoordinates.y),
                  left: Math.min(annotation.coordinates.x, annotation.endCoordinates.x),
                  width: Math.abs(annotation.endCoordinates.x - annotation.coordinates.x),
                  height: Math.abs(annotation.endCoordinates.y - annotation.coordinates.y),
                  border: '2px solid red',
                  backgroundColor: 'rgba(0, 0, 255, 0.2)',
                  pointerEvents: 'none',
                }}></div>
            ))}
            {/* Box currently being drawn */}
            {showBox && (
              <div
                style={{
                  position: 'absolute',
                  top: Math.min(startCoordinates.y, endCoordinates.y),
                  left: Math.min(startCoordinates.x, endCoordinates.x),
                  width: Math.abs(endCoordinates.x - startCoordinates.x),
                  height: Math.abs(endCoordinates.y - startCoordinates.y),
                  border: '1px solid blue',
                  backgroundColor: 'rgba(0, 255, 0, 0.3)',
                  pointerEvents: 'none',
                }}></div>
            )}
          </div>

          {clickedCoordinate && <p className="mt-2 text-sm break-words">{clickedCoordinate}</p>}

          <div className="flex flex-col items-center justify-center">
            {showControls && (
              <div className="w-full flex flex-wrap justify-between gap-3 my-4">
                <DemoBtn className="h-9 w-32 gap-2" onClick={handleTicButtonClick}>
                  <span>Annotate</span>
                  <Icon icon={'mingcute:check-fill'} className="h-4 w-4" />
                </DemoBtn>
                <DemoBtn className="h-9 w-32 gap-1" onClick={handleCrossButtonClick}>
                  <span>Cancel</span>
                  <Icon icon={'charm:cross'} className="h-5 w-5" />
                </DemoBtn>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              <DemoBtn className="h-11 w-36 mt-2" onClick={handleRemoveAnnotations}>
                Remove Annotations
              </DemoBtn>
              <DemoBtn className="h-11 w-36 mt-2 bg-green-600" onClick={sendClick}>
                Send
              </DemoBtn>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ImageAnnotation;
