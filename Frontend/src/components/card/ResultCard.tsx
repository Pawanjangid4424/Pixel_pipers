/**
 * Result card shown under the upload card after the backend replies.
 * Shows the marked image, the number of pipes found, the threshold used,
 * and a button that opens the annotation tool.
 *
 * Responsive: stats are stacked on phones and placed in one wrapping row from `sm:` up.
 */
import React from 'react';
import { ImageAnnotation } from '..';

interface Props {
  infoDivRef: React.RefObject<HTMLDivElement>; // Demo page scrolls to this element
  image_url: string; // Cloudinary URL or inline base64 image from the backend
  count: string | null; // number of pipes detected
  value: number; // confidence threshold (0.1 – 0.9)
  classname: string;
}

const ResultImage: React.FC<Props> = ({
  infoDivRef,
  image_url,
  count,
  value,
  classname,
  ...restProps
}) => {
  return (
    <div
      ref={infoDivRef}
      className={`w-full my-12 sm:my-20 relative border border-gray-300 bg-gray-100 rounded-lg ${classname}`}
      {...restProps}>
      <h2 className="text-center text-xl sm:text-2xl py-2 font-bold">Result Image</h2>
      <div className="relative h-64 sm:h-80 md:h-96 flex justify-center items-center border border-dashed border-gray-400 m-2 rounded-lg p-2 overflow-hidden">
        <img
          src={image_url}
          alt="Result image"
          className="rounded-lg max-h-full max-w-full object-contain"
        />
      </div>
      <div className="w-full rounded-b-lg p-4 bg-gray-200 flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-evenly items-center gap-3 sm:gap-x-10">
        <p className="text-base sm:text-xl">
          No of Object: <span className="font-bold">{count}</span>
        </p>
        {/* Math.round fixes values like 0.7 * 100 = 70.00000000000001 */}
        <p className="text-base sm:text-xl">
          Confidence Threshold: <span className="font-bold">{Math.round(value * 100)}%</span>
        </p>
        <ImageAnnotation image_url={image_url} />
      </div>
    </div>
  );
};

export default ResultImage;
