/**
 * Confidence-threshold stepper:  [-] 0.6 [+]
 *
 * The value is the minimum confidence (0.1 – 0.9) the YOLO model needs before it counts
 * something as a pipe. Lower = more detections (and more mistakes), higher = fewer but surer.
 */
import React from 'react';
import { CounterBtn } from '@/components';

type CounterProps = {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  className?: string;
};

const Counter: React.FC<CounterProps> = ({ value, setValue, className = '' }) => {
  // toFixed(1) avoids floating point noise like 0.30000000000000004
  const decrement = () => {
    if (value > 0.1) {
      setValue(prevValue => parseFloat((prevValue - 0.1).toFixed(1)));
    }
  };

  const increment = () => {
    if (value < 0.9) {
      setValue(prevValue => parseFloat((prevValue + 0.1).toFixed(1)));
    }
  };

  return (
    <div className={`flex flex-row items-center ${className}`} title="Confidence threshold">
      <div className="flex flex-row items-center h-9 rounded-xl relative bg-gray-300">
        <CounterBtn onClick={decrement} children="-" aria-label="Decrease threshold" />
        <h6 className="text-base sm:text-lg mx-3 sm:mx-5 text-center">{value.toFixed(1)}</h6>
        <CounterBtn onClick={increment} children="+" aria-label="Increase threshold" />
      </div>
    </div>
  );
};

export default Counter;
