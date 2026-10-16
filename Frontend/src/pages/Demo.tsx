/**
 * Demo page – the main feature of Pixel Pipers.
 *
 * Flow:
 *  1. User picks an image (Upload button) or drags & drops it onto the preview box.
 *  2. User sets options:
 *       - confidence threshold (Counter, 0.1 – 0.9) → how sure the model must be to count a pipe
 *       - marker colour (colour picker)
 *       - marker style (toggle: dot or number on each pipe)
 *  3. "Send" → the image is resized/compressed in the browser (canvas) and sent to the
 *     Flask backend (`sendImageToServer` → POST /frontend).
 *  4. Backend runs the YOLO model and returns { count, image_url }. They are stored in Redux
 *     (fileSlice) and shown below in <ResultImage />.
 *
 * Responsive layout of the controls bar:
 *  - Phone (< 640px)  : 2-column grid, Send button full width at the bottom
 *  - Tablet / desktop : everything in one wrapping row
 */
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Counter, Loader, DemoBtn } from '@/components';
import { sendImageToServer } from '@/app/actions/fileAction';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { showToast } from '@/lib/validators';
import { ResultImage } from '@/components';

const Demo: React.FC = () => {
  // Data-URL of the selected image (shown in the preview box)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Confidence threshold sent to the model (0.6 = 60 %)
  const [value, setValue] = useState<number>(0.6);
  // Result coming back from the backend (see app/slices/fileSlice.ts)
  const { loading, image_url, count } = useAppSelector(state => state.file);
  // Used to scroll down to the result once it arrives
  const infoDivRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const confidence_threshold = value.toString();
  // 1 = number on every pipe, 0 = dot on every pipe (backend form field "key")
  const [toggleState, setToggleState] = useState(1);
  // Marker colour (backend form field "color")
  const [color, setColor] = useState('#05eb09');

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setColor(event.target.value);
  };

  const handleToggle = () => {
    setToggleState(prevState => (prevState === 1 ? 0 : 1));
  };

  // When a new result image arrives, smoothly scroll to it
  useEffect(() => {
    if (!loading && infoDivRef.current) {
      infoDivRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [image_url]);

  /**
   * Resize the image to max 800x600 and re-encode it as JPEG (70 % quality) before upload.
   * This keeps uploads small (< 500 KB) so the backend responds faster.
   */
  const handleSendImageToServer = () => {
    if (!previewImage) {
      showToast('Select a Image', 'warning');
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxWidth = 800;
      const maxHeight = 600;
      let width = image.width;
      let height = image.height;

      // Scale down while keeping the aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) {
            showToast('Failed to compress image', 'error');
            return;
          }
          const compressedFile = new File([blob], 'compressed_image.jpg');
          if (compressedFile.size > 500 * 1024) {
            showToast('Image size exceeds 500kb', 'warning');
            return;
          }
          // Convert the compressed file back to a data-URL and send it to the backend
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setPreviewImage(reader.result);
              dispatch(
                sendImageToServer({
                  previewImage: reader.result,
                  confidence_threshold,
                  toggleState,
                  color,
                })
              );
            }
          };
          reader.readAsDataURL(compressedFile);
        },
        'image/jpeg',
        0.7
      );
    };
    image.src = previewImage;
  };

  // File chosen through the Upload button
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      previewImageFromFile(file);
    }
  };

  // File dropped onto the preview box (desktop drag & drop)
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.items) {
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        if (event.dataTransfer.items[i].kind === 'file') {
          const file = event.dataTransfer.items[i].getAsFile();
          if (file) {
            previewImageFromFile(file);
          }
          break;
        }
      }
    }
  };

  // Read a File into a data-URL so it can be shown in <img>
  const previewImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Needed so the browser allows dropping a file on the box
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  return (
    // pt-24 leaves room for the fixed header
    <section className="bg-white pt-24 pb-12 sm:pt-32 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <h1 className="mb-6 sm:mb-8 text-center text-2xl font-bold tracking-tight text-gray-600 sm:text-4xl lg:text-5xl">
          Upload Your Image
        </h1>

        {/* ---------- Upload card ---------- */}
        <div className="w-full md:w-3/4 lg:max-w-4xl relative border border-gray-300 bg-gray-100 rounded-lg">
          <h2 className="text-center text-xl sm:text-2xl py-2 font-bold">Test Image</h2>

          {/* Preview / drop zone – height grows with the screen size */}
          <div
            className="relative h-64 sm:h-80 md:h-96 flex justify-center items-center border border-dashed border-gray-400 m-2 rounded-lg p-2 overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}>
            {previewImage ? (
              // object-contain keeps wide/tall photos inside the box on small screens
              <img
                src={previewImage}
                alt="Preview image"
                className="rounded-lg max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-gray-400 opacity-75 flex flex-col justify-center items-center gap-4 text-center">
                <Icon icon={'ph:image-square-thin'} className="h-14 w-14 sm:h-16 sm:w-16" />
                <span className="flex items-center gap-3 sm:gap-4">
                  <Icon icon={'cil:cloud-upload'} className="h-7 w-7 sm:h-8 sm:w-8" />
                  {/* Drag & drop only makes sense with a mouse, so the text changes on small screens */}
                  <h3 className="hidden md:block">Drop Your image here</h3>
                  <h3 className="md:hidden">Upload Image</h3>
                </span>
              </div>
            )}
          </div>

          {/* ---------- Controls bar ---------- */}
          <div className="w-full rounded-b-lg p-4 bg-gray-200 grid grid-cols-2 gap-4 justify-items-center items-center sm:flex sm:flex-wrap sm:justify-center sm:gap-6 lg:gap-10">
            {/* Upload: a <label> styled as a button that opens the hidden file input */}
            <label
              htmlFor="restaurantImage"
              className="inline-flex items-center justify-center shadow-md w-full max-w-[8rem] h-10 cursor-pointer bg-gray-900 text-gray-50 border border-transparent rounded-md font-semibold text-xs uppercase tracking-widest hover:bg-gray-700 active:bg-gray-900 focus:outline-none focus:border-gray-900 focus:ring ring-gray-300 transition ease-in-out duration-150">
              Upload
              <input
                id="restaurantImage"
                className="hidden"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            {/* Confidence threshold */}
            <Counter value={value} setValue={setValue} />

            {/* Marker colour */}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span className="hidden sm:inline">Color</span>
              <input
                type="color"
                value={color}
                onChange={handleColorChange}
                className="h-10 w-14 sm:w-16 cursor-pointer"
              />
            </label>

            {/* Marker style toggle: dot <-> number */}
            <div className="flex gap-3 items-center justify-center">
              <button
                type="button"
                aria-label="Toggle marker style"
                className={`rounded-full w-12 h-6 flex items-center p-1 ${
                  toggleState === 0 ? 'justify-start bg-gray-400' : 'justify-end bg-cyan-300'
                }`}
                onClick={handleToggle}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
              </button>
              <p className="w-14 text-sm text-gray-700">{toggleState === 0 ? 'dot' : 'number'}</p>
            </div>

            {/* Send – full width on phones (spans both grid columns) */}
            <DemoBtn
              onClick={handleSendImageToServer}
              children="Send"
              className="col-span-2 w-full sm:w-32 h-10"
            />
          </div>
        </div>

        {/* ---------- Result ---------- */}
        {loading && <Loader />}
        {!loading && image_url && (
          <ResultImage
            image_url={image_url}
            infoDivRef={infoDivRef}
            count={count}
            classname="md:w-3/4 lg:max-w-4xl"
            value={value}
          />
        )}
      </div>
    </section>
  );
};

export default Demo;
